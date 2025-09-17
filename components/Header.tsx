'use client';

import { 
  AppBar, 
  Toolbar, 
  Box, 
  Chip, 
  IconButton 
} from '@mui/material';
import { 
  Notifications as NotificationsIcon 
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useAuth } from '@/lib/auth/auth-context';
import LoginButton from '@/components/Auth/LoginButton';
import UserProfile from '@/components/Auth/UserProfile';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

export default function Header() {
  const { user, loading } = useAuth();
  return (
    <AppBar 
      position="static" 
      color="inherit" 
      elevation={0}
      sx={{ 
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Chip
            icon={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  animation: `${pulse} 2s ease-in-out infinite`
                }}
              />
            }
            label="捜索中"
            variant="outlined"
            sx={{
              backgroundColor: 'primary.50',
              color: 'primary.main',
              borderColor: 'primary.200',
              '& .MuiChip-icon': {
                marginLeft: 1
              }
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user && (
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
          )}
          {loading ? null : user ? <UserProfile /> : <LoginButton />}
        </Box>
      </Toolbar>
    </AppBar>
  );
}