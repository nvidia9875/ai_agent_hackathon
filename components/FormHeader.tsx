'use client';

import { Box, Typography, Paper } from '@mui/material';
import { Pets as PetsIcon } from '@mui/icons-material';

interface FormHeaderProps {
  title: string;
  subtitle?: string;
}

export default function FormHeader({ title, subtitle }: FormHeaderProps) {

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        pt: 8,
        pb: 6,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -2,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(0deg, rgba(245, 245, 245, 1) 0%, transparent 100%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 3, sm: 4, md: 6 },
          textAlign: 'center',
          zIndex: 1
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            mb: 3,
            backdropFilter: 'blur(10px)'
          }}
        >
          <PetsIcon sx={{ fontSize: 40, color: '#667eea' }} />
        </Paper>
        
        <Typography 
          variant="h3" 
          fontWeight="700"
          sx={{ 
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            letterSpacing: '-0.02em',
            color: 'white',
            mb: 2,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              fontWeight: 400,
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}