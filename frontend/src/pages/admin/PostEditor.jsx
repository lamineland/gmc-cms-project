import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, List, ListItem, ListItemButton, ListItemText, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import Save from '@mui/icons-material/Save';
import History from '@mui/icons-material/History';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import RichEditor from '../../components/RichEditor';
import MediaPicker from '../../components/MediaPicker';

const EMPTY = { title: '', content: '', excerpt: '', category_id: '', status: 'draft', featured_image: '', meta_title: '', meta_description: '', meta_keywords: '', is_featured: false, allow_comments: true };

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState('');
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState(null);
  const [picker, setPicker] = useState(null); // resolver fn for the image picker
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const load = () => api.get(`/posts/${id}`).then((r) => {
    const p = r.data.data;
    setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])), category_id: p.category_id || '' });
    setTags(p.tags.map((t) => t.name));
  }).catch((e) => setErrors(errorMessage(e)));

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data));
    api.get('/tags').then((r) => setAllTags(r.data.data.map((t) => t.name)));
    if (id) load();
  }, [id]); // eslint-disable-line

  const save = async (statusOverride) => {
    setSaving(true); setErrors('');
    const payload = { ...form, category_id: form.category_id || null, tags, change_note: note || undefined };
    if (statusOverride) payload.status = statusOverride;
    ['excerpt', 'featured_image', 'meta_title', 'meta_description', 'meta_keywords'].forEach((k) => { if (!payload[k]) payload[k] = null; });
    try {
      const r = id ? await api.put(`/posts/${id}`, payload) : await api.post('/posts', payload);
      toast(r.data.message);
      setNote('');
      if (!id) navigate(`/admin/posts/${r.data.data.post_id}`, { replace: true }); else load();
    } catch (e) { setErrors(errorMessage(e)); } finally { setSaving(false); }
  };

  const openVersions = () => api.get(`/posts/${id}/versions`).then((r) => setVersions(r.data.data));
  const restore = async (v) => {
    try { await api.post(`/posts/${id}/versions/${v.version_id}/restore`); toast(`Restored version ${v.version_number}`); setVersions(null); load(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  };

  const seoTitleLen = (form.meta_title || form.title).length;
  const seoDescLen = (form.meta_description || '').length;

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap spacing={1}>
        <Typography variant="h5" fontWeight={700}>{id ? 'Edit post' : 'New post'}</Typography>
        <Stack direction="row" spacing={1}>
          {id && <Button startIcon={<History />} onClick={openVersions}>History</Button>}
          <Button variant="outlined" onClick={() => save(can('editor') ? 'draft' : undefined)} disabled={saving || !form.title || !form.content}>Save draft</Button>
          {can('editor') && <Button variant="contained" startIcon={<Save />} onClick={() => save('published')} disabled={saving || !form.title || !form.content}>{form.status === 'published' ? 'Update' : 'Publish'}</Button>}
        </Stack>
      </Stack>
      {errors && <Alert severity="error" sx={{ mb: 2 }}>{errors}</Alert>}
      {!can('editor') && <Alert severity="info" sx={{ mb: 2 }}>As an author you save drafts; an editor reviews and publishes them.</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Stack spacing={2}>
            <TextField label="Title" fullWidth value={form.title} onChange={set('title')} inputProps={{ maxLength: 255 }} />
            <RichEditor value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} onPickImage={() => new Promise((resolve) => setPicker(() => resolve))} />
            <TextField label="Excerpt" fullWidth multiline minRows={2} value={form.excerpt} onChange={set('excerpt')} helperText="Short summary shown in lists. Auto-generated if left empty." />
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={600} gutterBottom>SEO</Typography>
              <Stack spacing={2}>
                <TextField label="Meta title" fullWidth value={form.meta_title} onChange={set('meta_title')} placeholder={form.title}
                  helperText={`${seoTitleLen}/60 characters`} error={seoTitleLen > 60} />
                <TextField label="Meta description" fullWidth multiline minRows={2} value={form.meta_description} onChange={set('meta_description')}
                  helperText={`${seoDescLen}/160 characters`} error={seoDescLen > 160} />
                <TextField label="Meta keywords" fullWidth value={form.meta_keywords} onChange={set('meta_keywords')} helperText="Comma separated" />
                <Box sx={{ p: 1.5, bgcolor: '#f8f9fc', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Search preview</Typography>
                  <Typography sx={{ color: '#1a0dab', fontSize: 18 }} noWrap>{form.meta_title || form.title || 'Page title'}</Typography>
                  <Typography sx={{ color: '#006621', fontSize: 13 }}>{window.location.origin}/posts/…</Typography>
                  <Typography variant="body2" color="text.secondary">{(form.meta_description || form.excerpt || '').slice(0, 160)}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Stack spacing={2}>
                <TextField select label="Status" value={form.status} onChange={set('status')} disabled={!can('editor')} fullWidth>
                  {['draft', 'published', 'archived'].map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
                </TextField>
                <TextField select label="Category" value={form.category_id} onChange={set('category_id')} fullWidth>
                  <MenuItem value="">Uncategorised</MenuItem>
                  {categories.map((c) => <MenuItem key={c.category_id} value={c.category_id}>{c.name}</MenuItem>)}
                </TextField>
                <Autocomplete multiple freeSolo options={allTags} value={tags} onChange={(_, v) => setTags(v)}
                  renderTags={(v, getProps) => v.map((o, i) => <Chip size="small" label={o} {...getProps({ index: i })} key={o} />)}
                  renderInput={(p) => <TextField {...p} label="Tags" helperText="Press Enter to add" />} />
                {can('editor') && <FormControlLabel control={<Switch checked={form.is_featured} onChange={set('is_featured')} />} label="Featured post" />}
                <FormControlLabel control={<Switch checked={form.allow_comments} onChange={set('allow_comments')} />} label="Allow comments" />
                {id && <TextField label="Change note (optional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth size="small" />}
              </Stack>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={600} gutterBottom>Featured image</Typography>
              {form.featured_image && <Box component="img" src={form.featured_image} alt="" sx={{ width: '100%', borderRadius: 1, mb: 1 }} />}
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => new Promise((res) => setPicker(() => res)).then((u) => setForm((f) => ({ ...f, featured_image: u })))}>Choose</Button>
                {form.featured_image && <Button size="small" color="error" onClick={() => setForm((f) => ({ ...f, featured_image: '' }))}>Remove</Button>}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <MediaPicker open={!!picker} onClose={() => { picker?.(null); setPicker(null); }} onSelect={(url) => { picker?.(url); setPicker(null); }} />
      <Dialog open={!!versions} onClose={() => setVersions(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Version history</DialogTitle>
        <DialogContent>
          <List>
            {versions?.map((v) => (
              <ListItem key={v.version_id} disablePadding secondaryAction={<Button size="small" onClick={() => restore(v)}>Restore</Button>}>
                <ListItemButton disableRipple sx={{ cursor: 'default' }}>
                  <ListItemText primary={`v${v.version_number} — ${v.title}`} secondary={`${new Date(v.created_at).toLocaleString()} · ${v.edited_by_username || 'unknown'}${v.change_note ? ` · ${v.change_note}` : ''}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setVersions(null)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
}
