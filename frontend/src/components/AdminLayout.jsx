import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar, Avatar, Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Dashboard from '@mui/icons-material/Dashboard';
import Article from '@mui/icons-material/Article';
import Category from '@mui/icons-material/Category';
import LocalOffer from '@mui/icons-material/LocalOffer';
import Comment from '@mui/icons-material/Comment';
import PermMedia from '@mui/icons-material/PermMedia';
import People from '@mui/icons-material/People';
import Person from '@mui/icons-material/Person';
import Public from '@mui/icons-material/Public';
import Logout from '@mui/icons-material/Logout';
import { useAuth } from '../auth/AuthContext';

const WIDTH = 240;
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: <Dashboard />, role: 'editor', end: true },
  { to: '/admin/posts', label: 'Posts', icon: <Article />, role: 'author' },
  { to: '/admin/categories', label: 'Categories', icon: <Category />, role: 'editor' },
  { to: '/admin/tags', label: 'Tags', icon: <LocalOffer />, role: 'author' },
  { to: '/admin/comments', label: 'Comments', icon: <Comment />, role: 'editor' },
  { to: '/admin/media', label: 'Media', icon: <PermMedia />, role: 'author' },
  { to: '/admin/users', label: 'Users', icon: <People />, role: 'admin' },
  { to: '/admin/profile', label: 'My profile', icon: <Person />, role: 'subscriber' },
];

export default function AdminLayout() {
  const { user, can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // subscribers (and anyone landing on the index without dashboard access) go to their profile
  if (pathname === '/admin' && !can('editor')) setTimeout(() => navigate(can('author') ? '/admin/posts' : '/admin/profile', { replace: true }));

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar><Typography variant="h6" fontWeight={700} color="primary">EduCMS</Typography></Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1 }}>
        {NAV.filter((n) => can(n.role)).map((n) => (
          <ListItemButton key={n.to} component={RouterLink} to={n.to} onClick={() => setOpen(false)} sx={{ borderRadius: 2, mb: 0.5 }}
            selected={n.end ? pathname === n.to : pathname.startsWith(n.to)}>
            <ListItemIcon sx={{ minWidth: 40 }}>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List sx={{ px: 1 }}>
        <ListItemButton component={RouterLink} to="/" sx={{ borderRadius: 2 }}><ListItemIcon sx={{ minWidth: 40 }}><Public /></ListItemIcon><ListItemText primary="View site" /></ListItemButton>
        <ListItemButton onClick={() => { logout(); navigate('/login'); }} sx={{ borderRadius: 2 }}><ListItemIcon sx={{ minWidth: 40 }}><Logout /></ListItemIcon><ListItemText primary="Sign out" /></ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ width: { md: `calc(100% - ${WIDTH}px)` }, ml: { md: `${WIDTH}px` }, borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1, display: { md: 'none' } }} aria-label="menu"><MenuIcon /></IconButton>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" label={user.role} color="primary" variant="outlined" sx={{ mr: 1, textTransform: 'capitalize' }} />
          <Typography variant="body2" sx={{ mr: 1.5, display: { xs: 'none', sm: 'block' } }}>{user.first_name || user.username}</Typography>
          <Avatar src={user.avatar || undefined} sx={{ width: 32, height: 32 }}>{(user.username || '?')[0].toUpperCase()}</Avatar>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: WIDTH } }}>{drawer}</Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' } }}>{drawer}</Drawer>
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, mt: 8 }}><Outlet /></Box>
    </Box>
  );
}
