'use client';

import { Avatar, Button, Menu, MenuItem, Typography, Box, Divider } from '@mui/material';
import { LogoutOutlined as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '@/lib/auth/auth-context';
import { useState } from 'react';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  return (
    <>
      <Button
        onClick={handleClick}
        sx={{
          borderRadius: '50px',
          minWidth: 'auto',
          p: 0.5,
          color: 'text.primary'
        }}
      >
        <Avatar
          src={user.photoURL || undefined}
          alt={user.displayName || 'User'}
          sx={{ width: 32, height: 32 }}
        >
          {user.displayName?.charAt(0).toUpperCase()}
        </Avatar>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPaper-root': {
            minWidth: 200,
            mt: 1
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="600">
            {user.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
          <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}