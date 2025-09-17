'use client';

import { Button, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '@/lib/auth/auth-context';
import { useState } from 'react';

export default function LoginButton() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
      onClick={handleLogin}
      disabled={loading}
      sx={{
        backgroundColor: '#4285f4',
        '&:hover': {
          backgroundColor: '#3367d6'
        },
        textTransform: 'none',
        fontSize: '16px',
        fontWeight: 500,
        py: 1.5,
        px: 3
      }}
    >
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  );
}