'use client';

import { 
  Drawer, 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider 
} from '@mui/material';
import {
  Pets as PawIcon,
  Dashboard as DashboardIcon,
  FileUpload as FileUploadIcon,
  Forum as ForumIcon,
  Settings as SettingsIcon,
  CameraAlt as CameraAltIcon,
  Psychology as PsychologyIcon,
  Hub as HubIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          position: 'static',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, px: 1 }}>
          <PawIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" component="h1" fontWeight="bold">
            PawMate
          </Typography>
        </Box>

        {/* Navigation */}
        <List sx={{ flexGrow: 1 }}>
          <ListItem disablePadding>
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

          <ListItem disablePadding>
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

          <ListItem disablePadding>
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

          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/ai-chat"
              sx={{ 
                borderRadius: 2,
                ...(pathname === '/ai-chat' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <ForumIcon sx={{ color: pathname === '/ai-chat' ? 'primary.main' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText 
                primary="AIチャット" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/settings"
              sx={{ 
                borderRadius: 2,
                ...(pathname === '/settings' ? {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.100' }
                } : {
                  '&:hover': { backgroundColor: 'grey.100' }
                })
              }}
            >
              <ListItemIcon>
                <SettingsIcon sx={{ color: pathname === '/settings' ? 'primary.main' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText 
                primary="設定" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* AI Agents Section */}
        <Box>
          <Typography 
            variant="caption" 
            sx={{ 
              px: 2, 
              mb: 1, 
              display: 'block',
              fontWeight: 600,
              color: 'grey.500',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
AIエージェント
          </Typography>

          <List dense>
            <ListItem disablePadding>
              <ListItemButton
                sx={{ 
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'grey.100' }
                }}
              >
                <ListItemIcon>
                  <CameraAltIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="画像解析エージェント" 
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                sx={{ 
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'grey.100' }
                }}
              >
                <ListItemIcon>
                  <HubIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="捜索統括エージェント" 
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                sx={{ 
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'grey.100' }
                }}
              >
                <ListItemIcon>
                  <PsychologyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="行動予測エージェント" 
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItemButton>
            </ListItem>

          </List>
        </Box>
      </Box>
    </Drawer>
  );
}