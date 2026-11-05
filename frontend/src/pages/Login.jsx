import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.from?.pathname || (u.role === 'subscriber' ? '/' : '/admin'), { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{ maxWidth: 420, mx: 'auto', mt: 6, p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Sign in</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField label="Email or username" fullWidth margin="normal" autoFocus required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <TextField label="Password" type="password" fullWidth margin="normal" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Button type="submit" variant="contained" fullWidth size="large" disabled={busy} sx={{ mt: 2 }}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      <Box sx={{ mt: 2, textAlign: 'center' }}><Typography variant="body2">No account? <Link component={RouterLink} to="/register">Sign up</Link></Typography></Box>
      <Alert severity="info" sx={{ mt: 3 }}>Demo accounts: <b>admin</b>, <b>editor</b>, <b>author</b> — password <b>admin123</b></Alert>
    </Paper>
  );
}
