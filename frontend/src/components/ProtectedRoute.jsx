import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ role = 'subscriber', children }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!can(role)) return <Box sx={{ p: 6, textAlign: 'center' }}><Typography variant="h5">403 — You don't have access to this page</Typography></Box>;
  return children;
}
