'use client';

import { Box } from '@mui/material';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

// Dynamically import client components to prevent hydration issues
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
const Header = dynamic(() => import('@/components/Header'), { ssr: false });
const GoogleMap = dynamic(() => import('@/components/GoogleMap'), { ssr: false });
const AgentStatus = dynamic(() => import('@/components/AgentStatus'), { ssr: false });
const PetMatchingCard = dynamic(() => import('@/components/PetMatchingCard'), { ssr: false });

export default function Home() {
  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Header />
          
          {/* メインコンテンツエリア */}
          <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
            {/* メインエリア - マップ（幅を50%に調整） */}
            <Box sx={{ width: '50%', overflow: 'hidden' }}>
              <GoogleMap />
            </Box>
            
            {/* 右サイドバー（残りの50%を使用） */}
            <Box sx={{ 
              width: '50%',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider'
            }}>
              {/* AIマッチング候補 - 上部 */}
              <Box sx={{ 
                height: '50%', 
                overflow: 'auto',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <PetMatchingCard />
              </Box>
              
              {/* AIエージェント状態 - 下部 */}
              <Box sx={{ 
                height: '50%', 
                overflow: 'auto'
              }}>
                <AgentStatus />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
