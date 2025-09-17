'use client';

import { Box, Typography, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface FormHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export default function FormHeader({ title, subtitle, showBackButton = true }: FormHeaderProps) {
  const router = useRouter();

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        {showBackButton && (
          <IconButton 
            onClick={() => router.back()}
            sx={{ 
              p: 1,
              '&:hover': {
                backgroundColor: 'grey.100'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h5" 
            fontWeight="700"
            sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              letterSpacing: '-0.02em',
              color: 'grey.900'
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 0.5,
                color: 'text.secondary',
                fontSize: '0.875rem'
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}