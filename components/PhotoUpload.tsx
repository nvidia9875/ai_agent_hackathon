'use client';

import { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button,
  Grid,
  IconButton
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';

export default function PhotoUpload() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setUploadedImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white', border: '1px solid', borderColor: 'grey.200' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Upload Photos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Clear, recent photos help our AI identify your pet faster. Upload 2-5 photos showing different angles.
      </Typography>

      {uploadedImages.length === 0 ? (
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            p: 6,
            textAlign: 'center',
            backgroundColor: 'grey.50',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'primary.50'
            }
          }}
          onClick={handleUploadClick}
        >
          <PhotoCameraIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" fontWeight="600" gutterBottom>
            Drop photos here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Support JPG, PNG up to 10MB each
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleUploadClick}
            sx={{ mt: 1 }}
          >
            Choose Photos
          </Button>
        </Box>
      ) : (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {uploadedImages.map((image, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Box
                  sx={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: 'primary.main'
                  }}
                >
                  <img
                    src={image}
                    alt={`Pet photo ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(index)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.7)'
                      }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            ))}
          </Grid>
          
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={handleUploadClick}
          >
            Add More Photos
          </Button>
        </Box>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
      />

      <Box sx={{ mt: 3, p: 2, backgroundColor: 'warning.50', borderRadius: 2 }}>
        <Typography variant="body2" color="warning.main" fontWeight="500">
          💡 Best results: Include close-up face shots, full body photos, and any distinctive markings or features.
        </Typography>
      </Box>
    </Paper>
  );
}