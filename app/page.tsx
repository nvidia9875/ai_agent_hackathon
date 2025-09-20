'use client';

import { Box } from '@mui/material';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

// Dynamically import client components to prevent hydration issues
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
const IntegratedBehaviorMap = dynamic(() => import('@/components/IntegratedBehaviorMap'), { ssr: false });

export default function Home() {

  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
        <Box sx={{ width: 240, flexShrink: 0 }}>
          <Sidebar />
        </Box>
        
        <Box sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
          <IntegratedBehaviorMap />
        </Box>
      </Box>
    </ProtectedRoute>
  );
}