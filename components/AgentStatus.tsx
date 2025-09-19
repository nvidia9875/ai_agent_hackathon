'use client';

import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  LinearProgress, 
  Stack,
  CircularProgress,
  Grid,
  Button
} from '@mui/material';
import { 
  SmartToy as SmartToyIcon,
  ImageSearch as ImageSearchIcon,
  Psychology as PsychologyIcon,
  ManageSearch as ManageSearchIcon 
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useState, useEffect } from 'react';

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
  id: string;
  name: string;
  status: 'idle' | 'processing' | 'error';
  progress: number;
  description: string;
  lastActivity: string;
  color: 'success' | 'warning' | 'error';
  icon: string;
}

interface AgentStatusResponse {
  success: boolean;
  agents: AgentData[];
  totalProcessed: number;
  activeAgents: number;
  overallProgress: number;
}

export default function AgentStatus() {
  const [agentData, setAgentData] = useState<AgentStatusResponse>({
    success: false,
    agents: [],
    totalProcessed: 0,
    activeAgents: 0,
    overallProgress: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch('/api/agents/status');
      const data: AgentStatusResponse = await response.json();
      
      if (data.success) {
        setAgentData(data);
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 初回読み込み
    fetchAgentStatus();
    
    // 5秒ごとに状態を更新
    const interval = setInterval(fetchAgentStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'ImageSearch':
        return <ImageSearchIcon />;
      case 'Psychology':
        return <PsychologyIcon />;
      case 'ManageSearch':
        return <ManageSearchIcon />;
      default:
        return <SmartToyIcon />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'idle':
        return '待機中';
      case 'processing':
        return '処理中';
      case 'error':
        return 'エラー';
      default:
        return '不明';
    }
  };

  const testAgentStatus = async (status: 'idle' | 'processing' | 'error') => {
    try {
      let action = null;
      if (status === 'processing') {
        action = 'analysis_started';
      } else if (status === 'idle') {
        action = 'image_analysis_completed';
      }

      await fetch('/api/agents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'visual-detective', status, action })
      });
      // 状態を強制更新
      fetchAgentStatus();
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%', height: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            AIエージェント状態
          </Typography>
        </Box>
        
        {/* テスト用ボタン */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => testAgentStatus('idle')}
            sx={{ fontSize: '0.7rem' }}
          >
            待機
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => testAgentStatus('processing')}
            sx={{ fontSize: '0.7rem' }}
          >
            処理中
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => testAgentStatus('error')}
            sx={{ fontSize: '0.7rem' }}
          >
            エラー
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {agentData.agents.map((agent, index) => (
          <Grid item xs={12} sm={6} md={4} key={agent.id}>
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
                      },
                      ...(agent.status === 'processing' && {
                        animation: `${pulse} 2s infinite`
                      })
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
                      {getIconComponent(agent.icon)}
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
                  label={getStatusLabel(agent.status)}
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
                {agentData.totalProcessed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                解析済み画像
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary.700">
                {agentData.activeAgents}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                アクティブエージェント
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary.700">
                {agentData.overallProgress}%
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