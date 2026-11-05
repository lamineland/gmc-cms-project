import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Alert, Avatar, Box, Button, Chip, Divider, Link, List, ListItem, ListItemAvatar, ListItemText, Paper, Stack, TextField, Typography } from '@mui/material';
import ThumbUp from '@mui/icons-material/ThumbUp';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

export default function PostView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPost(null); setError('');
    api.get(`/posts/${slug}`, { params: { related: true } }).then((r) => {
      setPost(r.data.data);
      document.title = `${r.data.data.meta_title || r.data.data.title} · EduCMS`;
      if (r.data.data.status === 'published') api.get(`/posts/${r.data.data.post_id}/comments`).then((c) => setComments(c.data.data));
    }).catch((e) => setError(errorMessage(e)));
    return () => { document.title = 'EduCMS'; };
  }, [slug]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!post) return null;

  const like = () => api.post(`/posts/${post.post_id}/like`).then((r) => setPost({ ...post, like_count: r.data.data.like_count })).catch((e) => toast(errorMessage(e), 'error'));
  const send = async () => {
    try {
      const r = await api.post(`/posts/${post.post_id}/comments`, { content: text });
      toast(r.data.message); setText('');
      if (r.data.data.status === 'approved') setComments((c) => [...c, { ...r.data.data, username: user.username }]);
    } catch (e) { toast(errorMessage(e), 'error'); }
  };

  return (
    <Box sx={{ maxWidth: 780, mx: 'auto' }}>
      {post.status !== 'published' && <Alert severity="warning" sx={{ mb: 2 }}>Preview — this post is {post.status}.</Alert>}
      {post.category_name && <Chip label={post.category_name} color="primary" size="small" sx={{ mb: 1 }} />}
      <Typography variant="h3" fontWeight={700} gutterBottom>{post.title}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        By {post.author_first_name ? `${post.author_first_name} ${post.author_last_name || ''}` : post.author_username} · {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'unpublished'} · {post.reading_time} min read · {post.view_count} views
      </Typography>
      {post.featured_image && <Box component="img" src={post.featured_image} alt="" sx={{ width: '100%', borderRadius: 2, mb: 3 }} />}
      <Box sx={{ typography: 'body1', lineHeight: 1.8, '& img': { maxWidth: '100%' }, '& blockquote': { borderLeft: '4px solid #ccd', m: 0, pl: 2, color: 'text.secondary' } }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
      <Stack direction="row" spacing={1} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
        {post.tags.map((t) => <Chip key={t.tag_id} label={`#${t.name}`} size="small" variant="outlined" />)}
      </Stack>
      <Button startIcon={<ThumbUp />} onClick={like} disabled={!user} sx={{ mt: 2 }}>{post.like_count} {user ? 'Like' : '(sign in to like)'}</Button>

      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" gutterBottom>Comments ({comments.length})</Typography>
      {post.status === 'published' && post.allow_comments && (user ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <TextField multiline minRows={2} placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} />
          <Box><Button variant="contained" disabled={!text.trim()} onClick={send}>Post comment</Button></Box>
        </Stack>
      ) : <Alert severity="info" sx={{ mb: 2 }}><Link component={RouterLink} to="/login">Sign in</Link> to join the discussion.</Alert>)}
      <List>
        {comments.map((c) => (
          <ListItem key={c.comment_id} alignItems="flex-start" disableGutters>
            <ListItemAvatar><Avatar>{(c.username || '?')[0].toUpperCase()}</Avatar></ListItemAvatar>
            <ListItemText primary={<>{c.username || 'deleted user'} <Typography component="span" variant="caption" color="text.secondary">· {new Date(c.created_at).toLocaleString()}</Typography></>} secondary={c.content} secondaryTypographyProps={{ color: 'text.primary', sx: { whiteSpace: 'pre-wrap' } }} />
          </ListItem>
        ))}
      </List>

      {post.related?.length > 0 && (
        <Paper sx={{ p: 2, mt: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Related articles</Typography>
          {post.related.map((r) => <Box key={r.post_id}><Link component={RouterLink} to={`/posts/${r.slug}`}>{r.title}</Link></Box>)}
        </Paper>
      )}
    </Box>
  );
}
