// Integration tests: need the Postgres container from docker-compose (seeded with schema.sql).
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

const api = '/api/v1';
const suffix = Date.now().toString(36);
let admin; let author; let subscriber; let postId; let slug;

const login = async (email, password = 'admin123') =>
  (await request(app).post(`${api}/auth/login`).send({ email, password })).body.data;
const auth = (u) => ({ Authorization: `Bearer ${u.accessToken}` });

beforeAll(async () => {
  admin = await login('admin@educms.com');
  author = await login('author@educms.com');
  const reg = await request(app).post(`${api}/auth/register`).send({ username: `sub_${suffix}`, email: `sub_${suffix}@test.com`, password: 'password123' });
  subscriber = reg.body.data;
});

afterAll(async () => {
  await pool.query('DELETE FROM posts WHERE post_id = $1', [postId]);
  await pool.query('DELETE FROM users WHERE username = $1', [`sub_${suffix}`]);
  await pool.end();
});

describe('auth', () => {
  test('rejects bad credentials', async () => {
    expect((await request(app).post(`${api}/auth/login`).send({ email: 'admin', password: 'nope' })).status).toBe(401);
  });
  test('register creates a subscriber', () => expect(subscriber.user.role).toBe('subscriber'));
  test('register cannot escalate role', async () => {
    const r = await request(app).post(`${api}/auth/register`).send({ username: `x_${suffix}`, email: `x_${suffix}@t.com`, password: 'password123', role: 'admin' });
    expect(r.body.data.user.role).toBe('subscriber');
    await pool.query('DELETE FROM users WHERE username = $1', [`x_${suffix}`]);
  });
  test('/me requires a token', async () => {
    expect((await request(app).get(`${api}/auth/me`)).status).toBe(401);
    expect((await request(app).get(`${api}/auth/me`).set(auth(admin))).body.data.username).toBe('admin');
  });
  test('validation errors are 422', async () => {
    expect((await request(app).post(`${api}/auth/register`).send({ username: 'a', email: 'x', password: '1' })).status).toBe(422);
  });
});

describe('posts & RBAC', () => {
  test('subscriber cannot create posts', async () => {
    expect((await request(app).post(`${api}/posts`).set(auth(subscriber)).send({ title: 't', content: 'c' })).status).toBe(403);
  });
  test('author creates a draft (status forced) and content is sanitized', async () => {
    const r = await request(app).post(`${api}/posts`).set(auth(author))
      .send({ title: `Test ${suffix}`, content: '<p>hi</p><script>alert(1)</script>', status: 'published', tags: ['jest'] });
    expect(r.status).toBe(201);
    expect(r.body.data.status).toBe('draft');
    expect(r.body.data.content).toBe('<p>hi</p>');
    expect(r.body.data.tags[0].slug).toBe('jest');
    ({ post_id: postId, slug } = r.body.data);
  });
  test('draft is hidden from the public', async () => {
    expect((await request(app).get(`${api}/posts/${slug}`)).status).toBe(404);
    expect((await request(app).get(`${api}/posts/${slug}`).set(auth(author))).status).toBe(200);
  });
  test('editor/admin publishes; public can then read; versions recorded', async () => {
    const r = await request(app).put(`${api}/posts/${postId}`).set(auth(admin)).send({ status: 'published', change_note: 'go live' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('published');
    expect((await request(app).get(`${api}/posts/${slug}`)).status).toBe(200);
    const v = await request(app).get(`${api}/posts/${postId}/versions`).set(auth(admin));
    expect(v.body.data.length).toBeGreaterThanOrEqual(2);
  });
  test('author cannot edit someone else\'s post', async () => {
    expect((await request(app).put(`${api}/posts/1`).set(auth(author)).send({ title: 'hijack' })).status).toBe(403);
  });
  test('public search works', async () => {
    const r = await request(app).get(`${api}/posts?search=${encodeURIComponent('Test ' + suffix)}`);
    expect(r.body.data.map((p) => p.post_id)).toContain(postId);
  });
});

describe('comments', () => {
  test('subscriber comment is pending, then approved by admin', async () => {
    const c = await request(app).post(`${api}/posts/${postId}/comments`).set(auth(subscriber)).send({ content: 'Nice <b>post</b>' });
    expect(c.status).toBe(201);
    expect(c.body.data.status).toBe('pending');
    expect((await request(app).get(`${api}/posts/${postId}/comments`)).body.data).toHaveLength(0);
    expect((await request(app).put(`${api}/comments/${c.body.data.comment_id}/status`).set(auth(subscriber)).send({ status: 'approved' })).status).toBe(403);
    await request(app).put(`${api}/comments/${c.body.data.comment_id}/status`).set(auth(admin)).send({ status: 'approved' });
    expect((await request(app).get(`${api}/posts/${postId}/comments`)).body.data[0].content).toBe('Nice post');
  });
});

describe('admin-only', () => {
  test('users list is admin only', async () => {
    expect((await request(app).get(`${api}/users`).set(auth(author))).status).toBe(403);
    expect((await request(app).get(`${api}/users`).set(auth(admin))).status).toBe(200);
  });
  test('analytics for editors+', async () => {
    expect((await request(app).get(`${api}/analytics/overview`).set(auth(author))).status).toBe(403);
    const r = await request(app).get(`${api}/analytics/overview`).set(auth(admin));
    expect(r.body.data.totals.posts).toBeGreaterThan(0);
  });
});
