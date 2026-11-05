import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function Tags() {
  const toast = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const load = useCallback(() => api.get('/tags').then((r) => setRows(r.data.data)), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (edit.tag_id) await api.put(`/tags/${edit.tag_id}`, edit); else await api.post('/tags', edit);
      toast('Tag saved'); setEdit(null); load();
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const remove = async () => {
    try { await api.delete(`/tags/${del.tag_id}`); toast('Tag deleted'); setDel(null); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Tags</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ name: '', description: '' })}>New tag</Button>
      </Stack>
      <TableContainer component={Paper}><Table size="small">
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Slug</TableCell><TableCell>Description</TableCell><TableCell align="right">Posts</TableCell>{can('editor') && <TableCell align="right">Actions</TableCell>}</TableRow></TableHead>
        <TableBody>{rows.map((t) => (
          <TableRow key={t.tag_id} hover>
            <TableCell><b>{t.name}</b></TableCell><TableCell>{t.slug}</TableCell><TableCell>{t.description || '—'}</TableCell><TableCell align="right">{t.post_count}</TableCell>
            {can('editor') && <TableCell align="right">
              <IconButton size="small" onClick={() => setEdit({ ...t, description: t.description || '' })}><Edit fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => setDel(t)}><Delete fontSize="small" /></IconButton>
            </TableCell>}
          </TableRow>))}</TableBody>
      </Table></TableContainer>
      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{edit?.tag_id ? 'Edit tag' : 'New tag'}</DialogTitle>
        {edit && <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Name" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <TextField label="Description" multiline minRows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        </Stack></DialogContent>}
        <DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" onClick={save} disabled={!edit?.name?.trim()}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} text={`Delete tag "${del?.name}"? It will be removed from all posts.`} onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
