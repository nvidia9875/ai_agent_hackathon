'use client';

import { Box, Typography, Paper, Button } from '@mui/material';
import Sidebar from '@/components/Sidebar';
import PhotoUpload from '@/components/PhotoUpload';
import PetInfoForm from '@/components/PetInfoForm';
import LastSeenForm from '@/components/LastSeenForm';
import ContactInfoForm from '@/components/ContactInfoForm';
import ProgressIndicator from '@/components/ProgressIndicator';

export default function UploadPetPage() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <Box sx={{ 
        flex: 1, 
        backgroundColor: 'grey.50', 
        p: 4,
        overflow: 'auto'
      }}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {/* Progress Section */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Let's Find Your Pet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Step 1 of 4
            </Typography>
            <ProgressIndicator step={1} totalSteps={4} />
          </Box>

          {/* Form Sections */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white' }}>
              <PhotoUpload />
            </Paper>
            
            <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white' }}>
              <PetInfoForm />
            </Paper>
            
            <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white' }}>
              <LastSeenForm />
            </Paper>
            
            <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white' }}>
              <ContactInfoForm />
            </Paper>
          </Box>

          {/* Footer Actions */}
          <Box sx={{ 
            mt: 6, 
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Button
                variant="outlined"
                sx={{ minWidth: 100, px: 4, py: 1.5 }}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                sx={{ minWidth: 100, px: 4, py: 1.5 }}
              >
                Next Step
              </Button>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Auto-saved
              </Typography>
              <Typography variant="body2" fontWeight="500" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Box component="span" sx={{ 
                  display: 'inline-block', 
                  animation: 'spin 2s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}>
                  🔄
                </Box>
                Our AI is already starting to search...
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}