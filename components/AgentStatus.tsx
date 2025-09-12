'use client';

import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  LinearProgress, 
  Stack,
  Skeleton
} from '@mui/material';
import { keyframes } from '@mui/system';

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

export default function AgentStatus() {
  return (
    <Box
      sx={{
        width: 320,
        backgroundColor: 'background.paper',
        p: 3,
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        overflowY: 'auto'
      }}
    >
      <Typography variant="h5" fontWeight="bold">
        AI Agents Status
      </Typography>

      {/* Visual Detective */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="600">
            Visual Detective
          </Typography>
          <Chip
            label="Active"
            size="small"
            sx={{
              backgroundColor: 'success.100',
              color: 'success.700',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={75}
          sx={{
            height: 6,
            borderRadius: 3,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'success.main',
              boxShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
            }
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Latest finding: Possible sighting near Oak Park.
        </Typography>
      </Paper>

      {/* Behavior Predictor */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="600">
            Behavior Predictor
          </Typography>
          <Chip
            label="Processing"
            size="small"
            sx={{
              backgroundColor: 'warning.100',
              color: 'warning.700',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={40}
          sx={{
            height: 6,
            borderRadius: 3,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'warning.main'
            }
          }}
        />
        <Stack spacing={0.5} sx={{ py: 0.5 }}>
          <Skeleton variant="text" width="100%" height={8} />
          <Skeleton variant="text" width="85%" height={8} />
        </Stack>
      </Paper>

      {/* Search Coordinator */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="600">
            Search Coordinator
          </Typography>
          <Chip
            label="Active"
            size="small"
            sx={{
              backgroundColor: 'success.100',
              color: 'success.700',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={90}
          sx={{
            height: 6,
            borderRadius: 3,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'success.main',
              boxShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
            }
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Latest finding: Deploying drones to Zone 3.
        </Typography>
      </Paper>

      {/* Emotional Support */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="600">
            Emotional Support
          </Typography>
          <Chip
            label="Standby"
            size="small"
            sx={{
              backgroundColor: 'info.100',
              color: 'info.700',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={100}
          sx={{
            height: 6,
            borderRadius: 3,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'info.main'
            }
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Ready to provide owner updates.
        </Typography>
      </Paper>
    </Box>
  );
}