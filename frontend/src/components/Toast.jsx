import { createContext, useCallback, useContext, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar key={toast?.key} open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}
