import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardActions, CardContent, CardMedia, Grid, IconButton, LinearProgress, Pagination, Stack, Tooltip, Typography } from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import api, { errorMessage } from '../../api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default function Media() {
  const toast = useToast();
  const input = useRef(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pg, setPg] = useState({ totalPages: 1 });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [drag, setDrag] = useState(false);
  const load = useCallback(() => api.get('/media', { params: { page, limit: 12 } }).then((r) => { setRows(r.data.data); setPg(r.data.pagination); }), [page]);
  useEffect(() => { load(); }, [load]);

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    setBusy(true);
    try { await api.post('/media', fd); toast(`${files.length} file(s) uploaded`); setPage(1); load(); } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const remove = async () => {
    try { await api.delete(`/media/${del.media_id}`); toast('File deleted'); setDel(null); load(); } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const copy = (m) => navigator.clipboard.writeText(`${window.location.origin}${m.url}`).then(() => toast('URL copied'));

  return (
    <>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Media library</Typography>
        <Button variant="contained" startIcon={<CloudUpload />} onClick={() => input.current.click()} disabled={busy}>Upload</Button>
        <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={(e) => upload(e.target.files)} />
      </Stack>
      {busy && <LinearProgress sx={{ mb: 2 }} />}
      <Box onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        sx={{ border: '2px dashed', borderColor: drag ? 'primary.main' : 'divider', borderRadius: 2, p: 2, mb: 3, textAlign: 'center', color: 'text.secondary', bgcolor: drag ? 'action.hover' : 'transparent' }}>
        Drag & drop images or PDFs here (max 5 MB each)
      </Box>
      <Grid container spacing={2}>
        {rows.map((m) => (
          <Grid item xs={6} sm={4} md={3} key={m.media_id}>
            <Card variant="outlined">
              {m.file_type === 'image'
                ? <CardMedia component="img" height="130" image={m.url} alt={m.alt_text || m.original_name} sx={{ objectFit: 'cover' }} />
                : <Box sx={{ height: 130, display: 'grid', placeItems: 'center', bgcolor: '#fafafa' }}><PictureAsPdf sx={{ fontSize: 48 }} color="error" /></Box>}
              <CardContent sx={{ py: 1 }}><Typography variant="body2" noWrap title={m.original_name}>{m.original_name}</Typography><Typography variant="caption" color="text.secondary">{size(m.file_size)}</Typography></CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Tooltip title="Copy URL"><IconButton size="small" onClick={() => copy(m)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDel(m)}><Delete fontSize="small" /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {rows.length === 0 && <Typography color="text.secondary">No files yet.</Typography>}
      {pg.totalPages > 1 && <Stack alignItems="center" sx={{ mt: 3 }}><Pagination count={pg.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" /></Stack>}
      <ConfirmDialog open={!!del} text={`Delete ${del?.original_name}? Posts that embed it will show a broken image.`} onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
