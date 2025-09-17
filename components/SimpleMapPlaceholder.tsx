'use client';

import { useState } from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import { 
  Map as MapIcon, 
  LocationOn as LocationIcon,
  Pets as PetsIcon 
} from '@mui/icons-material';

export default function SimpleMapPlaceholder() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Box sx={{ flex: 1, p: 3 }}>
      <Paper
        elevation={1}
        sx={{
          position: 'relative',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f1f8e9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 3,
          minHeight: 300
        }}
      >
        {/* アイコンと基本情報 */}
        <Box sx={{ textAlign: 'center' }}>
          <MapIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
            マップビュー
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            迷子ペットと発見場所を地図上で確認
          </Typography>
          <Chip 
            label="開発中" 
            color="primary" 
            variant="outlined"
            sx={{ mb: 3 }}
          />
        </Box>

        {/* 機能説明 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 4, 
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 600
        }}>
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <LocationIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography variant="subtitle2" fontWeight="bold">
              迷子場所
            </Typography>
            <Typography variant="caption" color="text.secondary">
              最後に見た場所
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <PetsIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="subtitle2" fontWeight="bold">
              発見場所
            </Typography>
            <Typography variant="caption" color="text.secondary">
              保護された場所
            </Typography>
          </Box>
        </Box>

        {/* 詳細表示ボタン */}
        <Button
          variant="outlined"
          onClick={() => setShowDetails(!showDetails)}
          sx={{ mt: 2 }}
        >
          {showDetails ? '詳細を隠す' : '機能詳細を見る'}
        </Button>

        {/* 詳細情報 */}
        {showDetails && (
          <Box sx={{ 
            backgroundColor: 'background.paper',
            borderRadius: 2,
            p: 3,
            maxWidth: 500,
            boxShadow: 1
          }}>
            <Typography variant="h6" gutterBottom>
              予定機能
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  迷子ペットの最後に見た場所をマーカー表示
                </Typography>
              </li>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  発見されたペットの保護場所をマーカー表示
                </Typography>
              </li>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  近隣エリアでの検索範囲を可視化
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  リアルタイムで情報を更新表示
                </Typography>
              </li>
            </ul>
          </Box>
        )}
      </Paper>
    </Box>
  );
}