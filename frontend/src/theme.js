import { createTheme } from '@mui/material';

export default createTheme({
  palette: {
    primary: { main: '#3f51b5' },
    secondary: { main: '#00897b' },
    background: { default: '#f5f6fa' },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif', button: { textTransform: 'none', fontWeight: 600 } },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #e6e8ef' } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
