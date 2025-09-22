'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createGuestUser } from '@/lib/utils/guest-user';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { Google as GoogleIcon, PersonOutline as PersonIcon } from '@mui/icons-material';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, setUser } = useAuth();

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

  const handleGuestSignIn = async () => {
    setError('');
    setGuestLoading(true);
    try {
      const guestUser = createGuestUser();
      localStorage.setItem('guestUser', JSON.stringify(guestUser));
      setUser(guestUser as any);
      router.push('/');
    } catch (error: any) {
      setError('ゲストログインに失敗しました');
    } finally {
      setGuestLoading(false);
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
          disabled={loading || guestLoading}
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

        <Divider sx={{ my: 3 }}>または</Divider>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={guestLoading ? <CircularProgress size={20} /> : <PersonIcon />}
          onClick={handleGuestSignIn}
          disabled={loading || guestLoading}
          sx={{ 
            py: 1.5,
            fontSize: '1.1rem',
            textTransform: 'none',
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            }
          }}
        >
          {guestLoading ? 'ゲストモードで開始中...' : 'ゲストモードで開始'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          ゲストモードではブラウザのキャッシュにデータが保存されます。
          <br />
          キャッシュをクリアするとデータは失われます。
        </Typography>
      </Paper>
    </Box>
  );
}