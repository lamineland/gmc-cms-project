# EduCMS — Educational Content Management System

A full-stack CMS for educational institutions: posts with versioning, categories/tags, media library,
comment moderation, role-based access (admin / editor / author / subscriber), SEO fields and an analytics dashboard.

| Layer | Tech |
|---|---|
| Backend | Node.js, Express, JWT (access + refresh), express-validator, Multer, Helmet, rate limiting |
| Database | PostgreSQL 16 (schema, views, triggers, full-text index), Redis 7 (cache, optional) |
| Frontend | React 18, Vite, Material-UI |
| Infra | Docker Compose for Postgres + Redis (and optionally the API) |

## Quick start

Requires Docker and Node.js 16+.

```bash
# 1. Postgres + Redis (schema.sql is loaded automatically on first start)
docker compose up -d postgres redis      # or: docker-compose up -d postgres redis

# 2. API  (http://localhost:5055)
cd backend
cp .env.example .env                     # already present if you used the generated project
npm install
npm run dev

# 3. Admin panel + public site  (http://localhost:3001)
cd ../frontend
npm install
npm run dev
```

Demo accounts (password **`admin123`**): `admin`, `editor`, `author`. Change them before any real deployment.

> Ports: the original spec used 5000/3000; on macOS 5000 is taken by AirPlay, so the API runs on **5055** and the UI on **3001**.
> The Vite dev server proxies `/api` and `/uploads` to the API, so no CORS setup is needed in development.

### Run the API in Docker too
```bash
docker compose --profile app up -d --build
```

### Reset the database
```bash
docker compose down -v && docker compose up -d postgres redis
```

## Roles

| Capability | subscriber | author | editor | admin |
|---|:-:|:-:|:-:|:-:|
| Read published posts, comment (moderated), like | ✅ | ✅ | ✅ | ✅ |
| Create/edit **own** posts (saved as drafts), upload media, create tags | | ✅ | ✅ | ✅ |
| Publish / archive / feature any post, edit any post | | | ✅ | ✅ |
| Manage categories, moderate comments, analytics dashboard | | | ✅ | ✅ |
| Manage users and roles | | | | ✅ |

## API overview (`/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `GET/PUT /auth/me` · `POST /auth/change-password` |
| Posts | `GET /posts` (`search, category, tag, author, sort, featured, page, limit`; `scope=manage&status=` for the admin list) · `GET /posts/:idOrSlug` · `POST /posts` · `PUT/DELETE /posts/:id` · `POST /posts/:id/like` |
| Versions | `GET /posts/:id/versions` · `GET /posts/:id/versions/:versionId` · `POST /posts/:id/versions/:versionId/restore` |
| Comments | `GET/POST /posts/:postId/comments` · `GET /comments?status=` · `PUT /comments/:id/status` · `DELETE /comments/:id` |
| Taxonomy | `/categories`, `/tags` (CRUD) |
| Media | `GET/POST /media` (multipart field `files`) · `PUT/DELETE /media/:id` |
| Users (admin) | `GET /users` · `GET/PUT/DELETE /users/:id` |
| Analytics | `GET /analytics/overview` |
| Health | `GET /health` |

Responses use `{ success, message, data, pagination? }`; validation errors return `422` with `errors: [{field, message}]`.

## Security notes
- Passwords hashed with bcrypt; constant-time-ish login (dummy hash for unknown users); self-registration can only create subscribers.
- Parameterised SQL everywhere (no string-built values); HTML content sanitised server-side (`sanitize-html`) and again in the browser (DOMPurify).
- Helmet headers, CORS allow-list, global + auth-specific rate limits, upload MIME allow-list + size limit, server-generated filenames.
- Short-lived access tokens + refresh tokens; disabled users are rejected on every request.
- Secrets live in `.env` (git-ignored). **Replace `JWT_SECRET`, `JWT_REFRESH_SECRET` and `DB_PASSWORD` for production.**

## Caching
Public post lists, categories, tags and the analytics overview are cached in Redis (60s / 30s TTL) and invalidated on every
write. If Redis is disabled or down (`REDIS_ENABLED=false`) the app simply skips caching.

## Tests
```bash
cd backend && npm test      # needs the Postgres container running
```
Unit tests (helpers, XSS sanitiser) + API integration tests (auth, RBAC, post lifecycle, versions, comment moderation, admin-only routes).

## Differences from the original spec
- Added a `post_versions` table (content versioning/rollback) and a GIN full-text index on posts.
- Seed users now carry a **real** bcrypt hash for `admin123` (the hashes in the spec were placeholders and would never match).
- Added `nodemailer` (email service, no-op unless `SMTP_HOST` is set) and `sanitize-html`; dropped the unused `joi`.
- `overrides.htmlparser2` is pinned to v9 so Jest can load `sanitize-html` (v12 is ESM-only).

## Project layout
```
cms-project/
├── docker-compose.yml        Postgres, Redis, optional API container
├── database/schema.sql       Tables, indexes, triggers, views, functions, seed data
├── backend/                  Express API (config, controllers, middleware, models, routes, services, utils, tests)
└── frontend/                 React + MUI (public site + role-aware admin panel)
```
