'use client';

import { Box } from '@mui/material';
import dynamic from 'next/dynamic';

// Dynamically import client components to prevent hydration issues
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
const Header = dynamic(() => import('@/components/Header'), { ssr: false });
const MapContainer = dynamic(() => import('@/components/MapContainer'), { ssr: false });
const AgentStatus = dynamic(() => import('@/components/AgentStatus'), { ssr: false });

export default function Home() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          <MapContainer />
          <AgentStatus />
        </Box>
      </Box>
    </Box>
  );
}
