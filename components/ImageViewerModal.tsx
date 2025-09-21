'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Fade,
  Backdrop,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

interface ImageViewerModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  title?: string;
  petType?: 'missing' | 'found';
}

export default function ImageViewerModal({
  open,
  onClose,
  images,
  currentIndex: initialIndex = 0,
  title,
  petType
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [initialIndex, open]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
    if (zoom <= 1.25) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex];
    link.download = `pet-image-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    const elem = document.getElementById('image-viewer-content');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (open) {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex]);

  if (!images || images.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.95)',
          m: 2,
          maxHeight: '95vh',
          width: '95vw'
        }
      }}
      BackdropComponent={Backdrop}
      BackdropProps={{
        sx: { bgcolor: 'rgba(0, 0, 0, 0.9)' }
      }}
    >
      <DialogContent
        id="image-viewer-content"
        sx={{
          p: 0,
          position: 'relative',
          height: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* ヘッダー */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            p: 2,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {title && (
              <Typography variant="h6" sx={{ color: 'white' }}>
                {title}
              </Typography>
            )}
            {petType && (
              <Chip
                label={petType === 'missing' ? '迷子ペット' : '発見ペット'}
                size="small"
                sx={{
                  bgcolor: petType === 'missing' ? 'error.main' : 'success.main',
                  color: 'white'
                }}
              />
            )}
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {currentIndex + 1} / {images.length}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleZoomOut} sx={{ color: 'white' }}>
              <ZoomOutIcon />
            </IconButton>
            <Typography sx={{ color: 'white', display: 'flex', alignItems: 'center', px: 1 }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton onClick={handleZoomIn} sx={{ color: 'white' }}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={handleFullscreen} sx={{ color: 'white' }}>
              <FullscreenIcon />
            </IconButton>
            <IconButton onClick={handleDownload} sx={{ color: 'white' }}>
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* 画像表示エリア */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Fade in={true} timeout={300}>
            <Box
              component="img"
              src={images[currentIndex]}
              alt={`ペット画像 ${currentIndex + 1}`}
              sx={{
                maxWidth: '90%',
                maxHeight: '80vh',
                objectFit: 'contain',
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s',
                pointerEvents: 'none'
              }}
            />
          </Fade>
        </Box>

        {/* ナビゲーションボタン */}
        {images.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
              }}
            >
              <PrevIcon sx={{ fontSize: 40 }} />
            </IconButton>
            
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
              }}
            >
              <NextIcon sx={{ fontSize: 40 }} />
            </IconButton>
          </>
        )}

        {/* サムネイル */}
        {images.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              display: 'flex',
              gap: 1,
              justifyContent: 'center',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 8 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 4 }
            }}
          >
            {images.map((img, index) => (
              <Box
                key={index}
                component="img"
                src={img}
                alt={`サムネイル ${index + 1}`}
                onClick={() => {
                  setCurrentIndex(index);
                  setZoom(1);
                  setPosition({ x: 0, y: 0 });
                }}
                sx={{
                  width: 60,
                  height: 60,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  opacity: currentIndex === index ? 1 : 0.5,
                  border: currentIndex === index ? '2px solid white' : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': { opacity: 0.8 }
                }}
              />
            ))}
          </Box>
        )}

        {/* 操作説明 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            textAlign: 'center'
          }}
        >
          <Typography variant="caption">
            矢印キーで画像切替 • +/-でズーム • ESCで閉じる
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}