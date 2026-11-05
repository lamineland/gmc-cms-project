import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, ImageList, ImageListItem, Typography, Button, DialogActions } from '@mui/material';
import api from '../api';

export default function MediaPicker({ open, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (open) api.get('/media', { params: { type: 'image', limit: 60 } }).then((r) => setItems(r.data.data)).catch(() => setItems([]));
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Choose an image</DialogTitle>
      <DialogContent>
        {items.length === 0 && <Typography color="text.secondary">No images yet — upload some in the Media library.</Typography>}
        <ImageList cols={4} gap={8}>
          {items.map((m) => (
            <ImageListItem key={m.media_id} sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', '&:hover': { outline: '3px solid #3f51b5' } }} onClick={() => onSelect(m.url)}>
              <img src={m.url} alt={m.alt_text || m.original_name} loading="lazy" style={{ height: 120, objectFit: 'cover' }} />
            </ImageListItem>
          ))}
        </ImageList>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
    </Dialog>
  );
}
