import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, IconButton, InputAdornment, MenuItem, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import Search from '@mui/icons-material/Search';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const COLORS = { published: 'success', draft: 'default', archived: 'warning' };

export default function Posts() {
  const { can } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ totalPages: 1, totalItems: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => {
    api.get('/posts', { params: { scope: 'manage', page, limit: 10, status, search: search || undefined } })
      .then((r) => { setRows(r.data.data); setPg(r.data.pagination); }).catch((e) => toast(errorMessage(e), 'error'));
  }, [page, status, search, toast]);
  useEffect(load, [load]);

  const remove = async () => {
    try { await api.delete(`/posts/${toDelete.post_id}`); toast('Post deleted'); setToDelete(null); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap spacing={1}>
        <Typography variant="h5" fontWeight={700}>Posts <Typography component="span" color="text.secondary">({pg.totalItems})</Typography></Typography>
        <Button variant="contained" startIcon={<Add />} component={RouterLink} to="/admin/posts/new">New post</Button>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <TextField size="small" select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
          {['all', 'published', 'draft', 'archived'].map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s === 'all' ? 'All statuses' : s}</MenuItem>)}
        </TextField>
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Title</TableCell><TableCell>Author</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell align="right">Views</TableCell><TableCell>Updated</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No posts found</TableCell></TableRow>}
            {rows.map((p) => (
              <TableRow key={p.post_id} hover>
                <TableCell sx={{ maxWidth: 320 }}><Typography noWrap fontWeight={600}>{p.title}</Typography>{p.is_featured && <Chip label="featured" size="small" color="secondary" sx={{ ml: 0 }} />}</TableCell>
                <TableCell>{p.author_username}</TableCell>
                <TableCell>{p.category_name || '—'}</TableCell>
                <TableCell><Chip size="small" label={p.status} color={COLORS[p.status]} sx={{ textTransform: 'capitalize' }} /></TableCell>
                <TableCell align="right">{p.view_count}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(p.updated_at).toLocaleDateString()}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="View"><IconButton size="small" component={RouterLink} to={`/posts/${p.slug}`}><Visibility fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton size="small" component={RouterLink} to={`/admin/posts/${p.post_id}`}><Edit fontSize="small" /></IconButton></Tooltip>
                  {(can('editor')) && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setToDelete(p)}><Delete fontSize="small" /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pg.totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><Pagination count={pg.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" /></Box>}
      <ConfirmDialog open={!!toDelete} text={`Permanently delete "${toDelete?.title}" and all its comments and versions?`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
