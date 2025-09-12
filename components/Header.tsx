'use client';

import { 
  AppBar, 
  Toolbar, 
  Box, 
  Chip, 
  IconButton, 
  Avatar 
} from '@mui/material';
import { 
  Notifications as NotificationsIcon 
} from '@mui/icons-material';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

export default function Header() {
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
            label="Search Active"
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
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'grey.300' }} />
        </Box>
      </Toolbar>
    </AppBar>
  );
}