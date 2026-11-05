import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import School from '@mui/icons-material/School';
import { useAuth } from '../auth/AuthContext';

export default function PublicLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <School color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: 'text.primary', textDecoration: 'none', fontWeight: 700 }}>EduCMS</Typography>
          {user ? (
            <>
              {can('author') && <Button component={RouterLink} to="/admin">Admin panel</Button>}
              <Button onClick={() => { logout(); navigate('/'); }}>Sign out</Button>
            </>
          ) : (
            <>
              <Button component={RouterLink} to="/login">Sign in</Button>
              <Button variant="contained" component={RouterLink} to="/register">Sign up</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}><Outlet /></Container>
      <Box component="footer" sx={{ py: 3, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>© {new Date().getFullYear()} EduCMS — Educational Content Management System</Box>
    </Box>
  );
}
