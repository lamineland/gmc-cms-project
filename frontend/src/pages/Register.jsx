import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Grid, Link, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await register(form); navigate('/'); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{ maxWidth: 520, mx: 'auto', mt: 4, p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Create your account</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={6}><TextField label="First name" fullWidth value={form.first_name} onChange={set('first_name')} /></Grid>
        <Grid item xs={6}><TextField label="Last name" fullWidth value={form.last_name} onChange={set('last_name')} /></Grid>
        <Grid item xs={12}><TextField label="Username" fullWidth required value={form.username} onChange={set('username')} /></Grid>
        <Grid item xs={12}><TextField label="Email" type="email" fullWidth required value={form.email} onChange={set('email')} /></Grid>
        <Grid item xs={12}><TextField label="Password" type="password" fullWidth required helperText="At least 8 characters" value={form.password} onChange={set('password')} /></Grid>
      </Grid>
      <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }}>Sign up</Button>
      <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>Already registered? <Link component={RouterLink} to="/login">Sign in</Link></Typography>
    </Paper>
  );
}
