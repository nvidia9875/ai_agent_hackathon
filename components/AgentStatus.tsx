'use client';

import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  LinearProgress, 
  Stack,
  CircularProgress,
  Grid
} from '@mui/material';
import { 
  SmartToy as SmartToyIcon,
  ImageSearch as ImageSearchIcon,
  Psychology as PsychologyIcon,
  ManageSearch as ManageSearchIcon 
} from '@mui/icons-material';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0% { 
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

interface AgentData {
  name: string;
  status: 'active' | 'processing' | 'idle';
  progress: number;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function AgentStatus() {
  const agents: AgentData[] = [
    {
      name: '画像解析',
      status: 'active',
      progress: 75,
      description: 'オークパーク周辺で発見',
      icon: <ImageSearchIcon />,
      color: 'success'
    },
    {
      name: '行動予測',
      status: 'processing',
      progress: 40,
      description: '移動パターン分析中',
      icon: <PsychologyIcon />,
      color: 'warning'
    },
    {
      name: '捜索統括',
      status: 'active',
      progress: 90,
      description: 'エリア3にドローン配備',
      icon: <ManageSearchIcon />,
      color: 'success'
    }
  ];

  return (
    <Box sx={{ p: 3, width: '100%', height: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToyIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">
          AIエージェント状態
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {agents.map((agent, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: '100%',
                border: '1px solid',
                borderColor: agent.status === 'idle' ? 'grey.300' : `${agent.color}.200`,
                borderRadius: 2,
                bgcolor: agent.status === 'idle' ? 'grey.50' : `${agent.color}.50`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 円形プログレスインジケーター */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                mb: 2
              }}>
                <Box sx={{ 
                  position: 'relative', 
                  display: 'inline-flex'
                }}>
                  <CircularProgress
                    variant="determinate"
                    value={agent.progress}
                    size={80}
                    thickness={4}
                    sx={{
                      color: agent.status === 'idle' ? 'grey.400' : `${agent.color}.main`,
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ 
                      color: agent.status === 'idle' ? 'grey.500' : `${agent.color}.700`
                    }}>
                      {agent.icon}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* エージェント名 */}
              <Typography 
                variant="subtitle2" 
                fontWeight="bold" 
                textAlign="center"
                gutterBottom
              >
                {agent.name}
              </Typography>

              {/* ステータスチップ */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Chip
                  label={
                    agent.status === 'active' ? '動作中' : 
                    agent.status === 'processing' ? '処理中' : 
                    '待機中'
                  }
                  size="small"
                  sx={{
                    backgroundColor: agent.status === 'idle' ? 'grey.200' : `${agent.color}.100`,
                    color: agent.status === 'idle' ? 'grey.600' : `${agent.color}.700`,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    height: 20
                  }}
                />
              </Box>

              {/* 説明文 */}
              <Typography 
                variant="caption" 
                color="text.secondary"
                textAlign="center"
                display="block"
                sx={{ 
                  fontSize: '0.7rem',
                  lineHeight: 1.3
                }}
              >
                {agent.description}
              </Typography>

              {/* プログレス値 */}
              <Typography 
                variant="caption" 
                fontWeight="bold"
                color={agent.status === 'idle' ? 'grey.500' : `${agent.color}.700`}
                textAlign="center"
                display="block"
                sx={{ mt: 1 }}
              >
                {agent.progress}%
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 追加の統計情報 */}
      <Box sx={{ 
        mt: 3, 
        p: 2, 
        bgcolor: 'primary.50',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'primary.200'
      }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary.700">
                15
              </Typography>
              <Typography variant="caption" color="text.secondary">
                解析済み画像
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary.700">
                3
              </Typography>
              <Typography variant="caption" color="text.secondary">
                アクティブエージェント
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary.700">
                87%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                総合進捗率
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}