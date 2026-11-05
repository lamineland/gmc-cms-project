import { useCallback, useEffect, useState } from 'react';
import { Chip, IconButton, MenuItem, Pagination, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import Delete from '@mui/icons-material/Delete';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const ROLES = ['admin', 'editor', 'author', 'subscriber'];

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pg, setPg] = useState({ totalPages: 1 });
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [del, setDel] = useState(null);

  useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => api.get('/users', { params: { page, limit: 10, search: search || undefined, role: role || undefined } }).then((r) => { setRows(r.data.data); setPg(r.data.pagination); }), [page, search, role]);
  useEffect(() => { load(); }, [load]);

  const patch = async (u, body) => {
    try { await api.put(`/users/${u.user_id}`, body); toast('User updated'); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const remove = async () => {
    try { await api.delete(`/users/${del.user_id}`); toast('User deleted'); setDel(null); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>Users</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search by name, username or email…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} sx={{ minWidth: 160 }} SelectProps={{ displayEmpty: true }}>
          <MenuItem value="">All roles</MenuItem>{ROLES.map((r) => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>)}
        </TextField>
      </Stack>
      <TableContainer component={Paper}><Table size="small">
        <TableHead><TableRow><TableCell>User</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Active</TableCell><TableCell>Last login</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>{rows.map((u) => {
          const self = u.user_id === me.user_id;
          return (
            <TableRow key={u.user_id} hover>
              <TableCell><b>{u.username}</b> {self && <Chip size="small" label="you" />}<Typography variant="caption" display="block" color="text.secondary">{[u.first_name, u.last_name].filter(Boolean).join(' ')}</Typography></TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><TextField select size="small" value={u.role} disabled={self} onChange={(e) => patch(u, { role: e.target.value })} variant="standard" sx={{ minWidth: 110, textTransform: 'capitalize' }}>{ROLES.map((r) => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>)}</TextField></TableCell>
              <TableCell><Switch size="small" checked={u.is_active} disabled={self} onChange={(e) => patch(u, { is_active: e.target.checked })} /></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{u.last_login ? new Date(u.last_login).toLocaleString() : 'never'}</TableCell>
              <TableCell align="right"><Tooltip title={self ? "You can't delete yourself" : 'Delete'}><span><IconButton size="small" color="error" disabled={self} onClick={() => setDel(u)}><Delete fontSize="small" /></IconButton></span></Tooltip></TableCell>
            </TableRow>);
        })}</TableBody>
      </Table></TableContainer>
      {pg.totalPages > 1 && <Stack alignItems="center" sx={{ mt: 2 }}><Pagination count={pg.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" /></Stack>}
      <ConfirmDialog open={!!del} text={`Delete user "${del?.username}"? Their posts stay but lose their author.`} onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
