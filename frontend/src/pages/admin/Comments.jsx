import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, IconButton, Link, Pagination, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tooltip, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import Report from '@mui/icons-material/Report';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import api, { errorMessage } from '../../api';
import { useToast } from '../../components/Toast';

const TABS = ['pending', 'approved', 'spam', 'trash'];

export default function Comments() {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pg, setPg] = useState({ totalPages: 1 });
  const load = useCallback(() => api.get('/comments', { params: { status: tab, page, limit: 10 } }).then((r) => { setRows(r.data.data); setPg(r.data.pagination); }), [tab, page]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (c, status) => {
    try { await api.put(`/comments/${c.comment_id}/status`, { status }); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const purge = async (c) => {
    try { await api.delete(`/comments/${c.comment_id}`); toast('Comment deleted'); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>Comment moderation</Typography>
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ mb: 2 }}>{TABS.map((t) => <Tab key={t} value={t} label={t} sx={{ textTransform: 'capitalize' }} />)}</Tabs>
      <TableContainer component={Paper}><Table size="small">
        <TableHead><TableRow><TableCell>Author</TableCell><TableCell>Comment</TableCell><TableCell>On post</TableCell><TableCell>Date</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Nothing in {tab}</TableCell></TableRow>}
          {rows.map((c) => (
            <TableRow key={c.comment_id} hover>
              <TableCell>{c.username || 'deleted user'}<Box><Chip size="small" label={c.status} /></Box></TableCell>
              <TableCell sx={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>{c.content}</TableCell>
              <TableCell><Link component={RouterLink} to={`/posts/${c.post_slug}`}>{c.post_title}</Link></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleString()}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {c.status !== 'approved' && <Tooltip title="Approve"><IconButton size="small" color="success" onClick={() => setStatus(c, 'approved')}><Check fontSize="small" /></IconButton></Tooltip>}
                {c.status !== 'spam' && <Tooltip title="Mark as spam"><IconButton size="small" color="warning" onClick={() => setStatus(c, 'spam')}><Report fontSize="small" /></IconButton></Tooltip>}
                {c.status !== 'trash' ? <Tooltip title="Move to trash"><IconButton size="small" onClick={() => setStatus(c, 'trash')}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                  : <Tooltip title="Delete permanently"><IconButton size="small" color="error" onClick={() => purge(c)}><DeleteOutline fontSize="small" /></IconButton></Tooltip>}
              </TableCell>
            </TableRow>))}
        </TableBody>
      </Table></TableContainer>
      {pg.totalPages > 1 && <Stack alignItems="center" sx={{ mt: 2 }}><Pagination count={pg.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" /></Stack>}
    </>
  );
}
