'use client';

import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressIndicatorProps {
  step: number;
  totalSteps: number;
}

export default function ProgressIndicator({ step, totalSteps }: ProgressIndicatorProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Step {step} of {totalSteps}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {Math.round(progress)}% Complete
        </Typography>
      </Box>
      
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            backgroundColor: 'primary.main',
            borderRadius: 4,
          }
        }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === step;
          const isCompleted = stepNumber < step;
          
          return (
            <Box
              key={stepNumber}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: isCompleted 
                  ? 'primary.main' 
                  : isActive 
                    ? 'primary.main' 
                    : 'grey.300',
                color: isCompleted || isActive ? 'white' : 'grey.600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}
            >
              {isCompleted ? '✓' : stepNumber}
            </Box>
          );
        })}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Photos</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Details</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Location</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Contact</Typography>
      </Box>
    </Box>
  );
}