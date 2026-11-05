import { useState } from 'react';
import { Alert, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ first_name: user.first_name || '', last_name: user.last_name || '', bio: user.bio || '' });
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [pwError, setPwError] = useState('');

  const save = async () => {
    try { const r = await api.put('/auth/me', form); setUser({ ...user, ...r.data.data }); toast('Profile updated'); } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const changePw = async () => {
    setPwError('');
    try { await api.post('/auth/change-password', pw); toast('Password changed'); setPw({ current_password: '', new_password: '' }); } catch (e) { setPwError(errorMessage(e)); }
  };

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>My profile</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Paper sx={{ p: 3 }}><Stack spacing={2}>
          <TextField label="Username" value={user.username} disabled /><TextField label="Email" value={user.email} disabled />
          <TextField label="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <TextField label="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <TextField label="Bio" multiline minRows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <Button variant="contained" onClick={save}>Save profile</Button>
        </Stack></Paper></Grid>
        <Grid item xs={12} md={6}><Paper sx={{ p: 3 }}><Stack spacing={2}>
          <Typography fontWeight={600}>Change password</Typography>
          {pwError && <Alert severity="error">{pwError}</Alert>}
          <TextField label="Current password" type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
          <TextField label="New password" type="password" helperText="At least 8 characters" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          <Button variant="outlined" onClick={changePw} disabled={!pw.current_password || pw.new_password.length < 8}>Change password</Button>
        </Stack></Paper></Grid>
      </Grid>
    </>
  );
}
