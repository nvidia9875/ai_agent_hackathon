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

      {/* Visual Detective Agent */}
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
            Visual Detective Agent
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
          画像解析により、オークパーク周辺でペットらしき動物を発見しました。
        </Typography>
      </Paper>

      {/* Behavior Predictor Agent */}
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
            Behavior Predictor Agent
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
        <Typography variant="caption" color="text.secondary">
          ペットの行動パターンを分析し、次の移動先を予測しています。
        </Typography>
      </Paper>

      {/* Search Coordinator Agent */}
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
            Search Coordinator Agent
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
          エリア3にドローンを配備し、効率的な捜索を指揮しています。
        </Typography>
      </Paper>
    </Box>
  );
}