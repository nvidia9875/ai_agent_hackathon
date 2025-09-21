'use client';

import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface NotificationContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export function SuccessNotificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [duration, setDuration] = useState(4000);

  const showNotification = (msg: string, sev: 'success' | 'error' | 'info', dur = 4000) => {
    setMessage(msg);
    setSeverity(sev);
    setDuration(dur);
    setOpen(true);
  };

  const showSuccess = (message: string, duration?: number) => {
    showNotification(message, 'success', duration);
  };

  const showError = (message: string, duration?: number) => {
    showNotification(message, 'error', duration);
  };

  const showInfo = (message: string, duration?: number) => {
    showNotification(message, 'info', duration);
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
        sx={{ 
          '& .MuiSnackbarContent-root': {
            minWidth: '300px'
          }
        }}
      >
        <Alert 
          onClose={handleClose} 
          severity={severity}
          sx={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              fontSize: '24px'
            },
            '& .MuiAlert-message': {
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center'
            },
            boxShadow: 3,
            ...(severity === 'success' && {
              backgroundColor: 'success.main',
              color: 'white',
              '& .MuiAlert-icon': {
                color: 'white'
              }
            })
          }}
          variant="filled"
          icon={severity === 'success' ? <CheckCircleIcon /> : undefined}
        >
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useSuccessNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useSuccessNotification must be used within a SuccessNotificationProvider');
  }
  return context;
}