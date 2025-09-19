'use client';

import { Box } from '@mui/material';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

// Dynamically import client components to prevent hydration issues
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
const GoogleMap = dynamic(() => import('@/components/GoogleMap'), { ssr: false });
const PetMatchingCard = dynamic(() => import('@/components/PetMatchingCard'), { ssr: false });

export default function Home() {
  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box sx={{ width: 240 }}>
          <Sidebar />
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* メインコンテンツエリア */}
          <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
            {/* メインエリア - マップ（幅を60%に調整） */}
            <Box sx={{ width: '60%', overflow: 'hidden' }}>
              <GoogleMap />
            </Box>
            
            {/* 右サイドバー - AIマッチング候補（残りの40%を使用） */}
            <Box sx={{ 
              width: '40%',
              overflow: 'auto',
              borderLeft: '1px solid',
              borderColor: 'divider'
            }}>
              <PetMatchingCard />
            </Box>
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
