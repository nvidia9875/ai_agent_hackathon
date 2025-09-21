'use client';

import { 
  Drawer, 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Badge,
  Typography
} from '@mui/material';
import {
  Pets as PawIcon,
  Dashboard as DashboardIcon,
  FileUpload as FileUploadIcon,
  Forum as ForumIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/lib/contexts/notification-context';

export default function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          position: 'fixed',
          top: 64, // ヘッダーの高さ
          height: 'calc(100vh - 64px)',
          zIndex: 1000,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        {/* Navigation */}
        <List sx={{ flexGrow: 1 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href="/"
              sx={{ 
                borderRadius: 2, 
                ...(pathname === '/' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <DashboardIcon sx={{ color: pathname === '/' ? 'primary.main' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText 
                primary="ダッシュボード" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href="/upload-pet"
              sx={{ 
                borderRadius: 2,
                ...(pathname === '/upload-pet' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <FileUploadIcon sx={{ color: pathname === '/upload-pet' ? 'primary.main' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText 
                primary="迷子ペット登録" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href="/found-pet"
              sx={{ 
                borderRadius: 2,
                ...(pathname === '/found-pet' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <PawIcon sx={{ color: pathname === '/found-pet' ? 'primary.main' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText 
                primary="ペット発見報告" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href="/agent-dashboard"
              sx={{ 
                borderRadius: 2,
                ...(pathname === '/agent-dashboard' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <SmartToyIcon sx={{ color: pathname === '/agent-dashboard' ? 'primary.main' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText 
                primary="AI捜索統括" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href="/chat"
              sx={{ 
                borderRadius: 2,
                ...(pathname === '/chat' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <ForumIcon sx={{ color: pathname === '/chat' ? 'primary.main' : 'inherit' }} />
                </Badge>
              </ListItemIcon>
              <ListItemText 
                primary="チャット" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

        </List>
      </Box>
    </Drawer>
  );
}