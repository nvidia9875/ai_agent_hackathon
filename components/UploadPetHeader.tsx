'use client';

import { 
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Close as CloseIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function UploadPetHeader() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleClose = () => {
    router.push('/');
  };

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
        <IconButton 
          edge="start" 
          color="inherit" 
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Report Missing Pet
        </Typography>
        
        <IconButton 
          color="inherit" 
          onClick={handleClose}
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}