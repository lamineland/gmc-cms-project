import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Grid, InputAdornment, Pagination, Stack, TextField, Typography, MenuItem } from '@mui/material';
import Search from '@mui/icons-material/Search';
import api from '../api';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data.data)); }, []);
  useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    api.get('/posts', { params: { page, limit: 9, search: search || undefined, category: category || undefined } })
      .then((r) => { setPosts(r.data.data); setPagination(r.data.pagination); });
  }, [page, search, category]);

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Learning resources & articles</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
          <TextField select label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} sx={{ minWidth: 220 }}>
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => <MenuItem key={c.category_id} value={c.slug}>{c.name} ({c.post_count})</MenuItem>)}
          </TextField>
        </Stack>
      </Box>
      {posts.length === 0 && <Typography color="text.secondary">No articles found.</Typography>}
      <Grid container spacing={3}>
        {posts.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.post_id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea component={RouterLink} to={`/posts/${p.slug}`} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
                {p.featured_image && <CardMedia component="img" height="160" image={p.featured_image} alt="" />}
                <CardContent sx={{ flex: 1 }}>
                  {p.category_name && <Chip size="small" label={p.category_name} color="primary" variant="outlined" sx={{ mb: 1 }} />}
                  <Typography variant="h6" fontWeight={600} gutterBottom>{p.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{p.excerpt}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    {p.author_first_name || p.author_username} · {p.reading_time} min read · {p.view_count} views
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      {pagination.totalPages > 1 && <Stack alignItems="center" sx={{ mt: 4 }}><Pagination count={pagination.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" /></Stack>}
    </>
  );
}
