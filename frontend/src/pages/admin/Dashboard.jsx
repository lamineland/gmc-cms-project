import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, Grid, LinearProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import api, { errorMessage } from '../../api';

const Stat = ({ label, value, color }) => (
  <Card variant="outlined"><CardContent>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
  </CardContent></Card>
);

const Bars = ({ rows, x, y, color = 'primary.main' }) => {
  const max = Math.max(1, ...rows.map((r) => r[y]));
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 120 }}>
      {rows.map((r) => (
        <Box key={r[x]} title={`${r[x]}: ${r[y]}`} sx={{ flex: 1, bgcolor: color, borderRadius: '3px 3px 0 0', height: `${Math.max((r[y] / max) * 100, 3)}%`, opacity: r[y] ? 1 : 0.25 }} />
      ))}
    </Box>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/analytics/overview').then((r) => setData(r.data.data)).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LinearProgress />;
  const t = data.totals;
  const maxCat = Math.max(1, ...data.postsByCategory.map((c) => c.posts));

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[['Posts', t.posts], ['Total views', t.total_views], ['Users', t.users], ['Comments', t.comments], ['Pending comments', t.pending_comments, t.pending_comments ? 'warning.main' : undefined], ['Media files', t.media]].map(([l, v, c]) => (
          <Grid item xs={6} md={4} lg={2} key={l}><Stat label={l} value={v} color={c} /></Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography fontWeight={600} gutterBottom>Posts created — last 14 days</Typography>
            <Bars rows={data.postsPerDay} x="day" y="posts" />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography fontWeight={600} gutterBottom>Posts by status</Typography>
            {data.postsByStatus.map((s) => <Chip key={s.status} label={`${s.status}: ${s.count}`} sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }} color={s.status === 'published' ? 'success' : 'default'} />)}
            <Typography fontWeight={600} sx={{ mt: 2 }} gutterBottom>Published per category</Typography>
            {data.postsByCategory.map((c) => (
              <Box key={c.name} sx={{ mb: 1 }}>
                <Typography variant="caption">{c.name} ({c.posts})</Typography>
                <LinearProgress variant="determinate" value={(c.posts / maxCat) * 100} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, overflowX: 'auto' }}>
            <Typography fontWeight={600} gutterBottom>Top posts</Typography>
            <Table size="small"><TableHead><TableRow><TableCell>Title</TableCell><TableCell align="right">Views</TableCell><TableCell align="right">Likes</TableCell><TableCell align="right">Comments</TableCell></TableRow></TableHead>
              <TableBody>{data.topPosts.map((p) => <TableRow key={p.post_id}><TableCell>{p.title}</TableCell><TableCell align="right">{p.view_count}</TableCell><TableCell align="right">{p.like_count}</TableCell><TableCell align="right">{p.comment_count}</TableCell></TableRow>)}</TableBody></Table>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, overflowX: 'auto' }}>
            <Typography fontWeight={600} gutterBottom>Recent activity</Typography>
            <Table size="small"><TableBody>
              {data.recentActivity.length === 0 && <TableRow><TableCell>No activity yet</TableCell></TableRow>}
              {data.recentActivity.map((a) => (
                <TableRow key={a.log_id}><TableCell><b>{a.username || 'system'}</b> {a.action}{a.description ? ` — ${a.description}` : ''}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString()}</TableCell></TableRow>
              ))}
            </TableBody></Table>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
