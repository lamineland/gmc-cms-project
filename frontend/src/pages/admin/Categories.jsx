import { useCallback, useEffect, useState } from 'react';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import api, { errorMessage } from '../../api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const EMPTY = { name: '', description: '', parent_id: '', display_order: 0, is_active: true };

export default function Categories() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const load = useCallback(() => api.get('/categories').then((r) => setRows(r.data.data)), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const payload = { ...edit, parent_id: edit.parent_id || null, display_order: Number(edit.display_order) || 0 };
    try {
      if (edit.category_id) await api.put(`/categories/${edit.category_id}`, payload); else await api.post('/categories', payload);
      toast('Category saved'); setEdit(null); load();
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const remove = async () => {
    try { await api.delete(`/categories/${del.category_id}`); toast('Category deleted'); setDel(null); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const nameOf = (id) => rows.find((c) => c.category_id === id)?.name || '—';

  return (
    <>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Categories</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ ...EMPTY })}>New category</Button>
      </Stack>
      <TableContainer component={Paper}><Table size="small">
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Slug</TableCell><TableCell>Parent</TableCell><TableCell align="right">Order</TableCell><TableCell align="right">Published posts</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>{rows.map((c) => (
          <TableRow key={c.category_id} hover>
            <TableCell><b>{c.name}</b></TableCell><TableCell>{c.slug}</TableCell><TableCell>{c.parent_id ? nameOf(c.parent_id) : '—'}</TableCell>
            <TableCell align="right">{c.display_order}</TableCell><TableCell align="right">{c.post_count}</TableCell>
            <TableCell><Chip size="small" label={c.is_active ? 'active' : 'hidden'} color={c.is_active ? 'success' : 'default'} /></TableCell>
            <TableCell align="right">
              <IconButton size="small" onClick={() => setEdit({ ...c, description: c.description || '', parent_id: c.parent_id || '' })}><Edit fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => setDel(c)}><Delete fontSize="small" /></IconButton>
            </TableCell>
          </TableRow>))}</TableBody>
      </Table></TableContainer>

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{edit?.category_id ? 'Edit category' : 'New category'}</DialogTitle>
        {edit && <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Name" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <TextField label="Description" multiline minRows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <TextField select label="Parent category" value={edit.parent_id} onChange={(e) => setEdit({ ...edit, parent_id: e.target.value })}>
            <MenuItem value="">None</MenuItem>
            {rows.filter((c) => c.category_id !== edit.category_id).map((c) => <MenuItem key={c.category_id} value={c.category_id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField label="Display order" type="number" value={edit.display_order} onChange={(e) => setEdit({ ...edit, display_order: e.target.value })} />
          <FormControlLabel control={<Switch checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />} label="Active" />
        </Stack></DialogContent>}
        <DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" onClick={save} disabled={!edit?.name?.trim()}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} text={`Delete "${del?.name}"? Its posts will become uncategorised.`} onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
