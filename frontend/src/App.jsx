import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import PostView from './pages/PostView';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import Posts from './pages/admin/Posts';
import PostEditor from './pages/admin/PostEditor';
import Categories from './pages/admin/Categories';
import Tags from './pages/admin/Tags';
import Comments from './pages/admin/Comments';
import Media from './pages/admin/Media';
import Users from './pages/admin/Users';
import Profile from './pages/admin/Profile';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/posts/:slug" element={<PostView />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<ProtectedRoute role="editor"><Dashboard /></ProtectedRoute>} />
        <Route path="posts" element={<ProtectedRoute role="author"><Posts /></ProtectedRoute>} />
        <Route path="posts/new" element={<ProtectedRoute role="author"><PostEditor /></ProtectedRoute>} />
        <Route path="posts/:id" element={<ProtectedRoute role="author"><PostEditor /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute role="editor"><Categories /></ProtectedRoute>} />
        <Route path="tags" element={<ProtectedRoute role="author"><Tags /></ProtectedRoute>} />
        <Route path="comments" element={<ProtectedRoute role="editor"><Comments /></ProtectedRoute>} />
        <Route path="media" element={<ProtectedRoute role="author"><Media /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute role="admin"><Users /></ProtectedRoute>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
