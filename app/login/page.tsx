'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 5,
          maxWidth: 400,
          width: '100%',
          m: 2,
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            🐾 PawMate
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            AI迷子ペット捜索システム
          </Typography>
          <Typography variant="body2" color="text.secondary">
            大切な家族との再会をサポートします
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
          onClick={handleGoogleSignIn}
          disabled={loading}
          sx={{ 
            py: 1.5,
            fontSize: '1.1rem',
            textTransform: 'none',
            background: 'linear-gradient(45deg, #4285F4 30%, #34A853 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #357ae8 30%, #2d9b47 90%)',
            }
          }}
        >
          {loading ? 'ログイン中...' : 'Googleアカウントでログイン'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
        </Typography>
      </Paper>
    </Box>
  );
}