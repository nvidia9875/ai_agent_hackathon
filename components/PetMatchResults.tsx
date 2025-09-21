'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
  Avatar,
  Divider,
  Badge
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Pets as PetsIcon
} from '@mui/icons-material';
import Image from 'next/image';

interface MatchResult {
  missingPetId: string;
  foundPetId: string;
  matchScore: number;
  visualSimilarity: number;
  locationProximity: number;
  timeDifference: number;
  matchDetails: {
    type: boolean;
    size: boolean;
    breed?: boolean;
    microchip?: boolean;
    color: string[];
    features: string[];
  };
  recommendedAction: 'high_match' | 'possible_match' | 'low_match';
  missingPet?: {
    id: string;
    name: string;
    type: string;
    imageUrl: string;
  };
}

interface PetMatchResultsProps {
  foundPetId?: string;
  onContactOwner?: (missingPetId: string) => void;
}

export default function PetMatchResults({ foundPetId, onContactOwner }: PetMatchResultsProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (foundPetId) {
      fetchMatches();
    }
  }, [foundPetId]);

  const fetchMatches = async () => {
    if (!foundPetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/match?foundPetId=${foundPetId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError('マッチング結果の取得に失敗しました');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadgeColor = (score: number) => {
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'default';
  };

  const getMatchIcon = (recommendedAction: string) => {
    switch (recommendedAction) {
      case 'high_match':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'possible_match':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getActionText = (recommendedAction: string) => {
    switch (recommendedAction) {
      case 'high_match':
        return '高確率で一致';
      case 'possible_match':
        return '可能性あり';
      default:
        return '低確率';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (matches.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        マッチする迷子ペットが見つかりませんでした
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        AIマッチング結果
      </Typography>

      <Grid container spacing={3}>
        {matches.map((match, index) => (
          <Grid item xs={12} key={index}>
            <Card 
              elevation={match.matchScore >= 75 ? 8 : 3}
              sx={{ 
                borderLeft: match.matchScore >= 75 ? '4px solid' : 'none',
                borderLeftColor: 'success.main',
                overflow: 'visible'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Badge
                      badgeContent={`${match.matchScore}%`}
                      color={getMatchBadgeColor(match.matchScore)}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '1rem',
                          height: 28,
                          minWidth: 28,
                        }
                      }}
                    >
                      {getMatchIcon(match.recommendedAction)}
                    </Badge>
                    
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {match.missingPet?.name || 'Unknown'}
                    </Typography>
                    
                    <Chip 
                      label={getActionText(match.recommendedAction)}
                      color={getMatchBadgeColor(match.matchScore)}
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  </Box>

                  {match.matchScore >= 50 && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => onContactOwner?.(match.missingPetId)}
                    >
                      飼い主に連絡
                    </Button>
                  )}
                </Box>

                <Grid container spacing={2}>
                  {/* ペット画像 */}
                  {match.missingPet?.imageUrl && (
                    <Grid item xs={12} sm={3}>
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          paddingTop: '100%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: 'grey.100'
                        }}
                      >
                        <Image
                          src={match.missingPet.imageUrl}
                          alt={match.missingPet.name}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                  )}

                  {/* マッチング詳細 */}
                  <Grid item xs={12} sm={match.missingPet?.imageUrl ? 9 : 12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        マッチング詳細
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6} sm={3}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              視覚的類似度
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={match.visualSimilarity}
                              sx={{ mt: 0.5, mb: 0.5 }}
                              color={match.visualSimilarity >= 70 ? 'success' : 'warning'}
                            />
                            <Typography variant="body2">
                              {match.visualSimilarity}%
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              <LocationIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              場所の近さ
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={match.locationProximity}
                              sx={{ mt: 0.5, mb: 0.5 }}
                            />
                            <Typography variant="body2">
                              {match.locationProximity}%
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              時間差
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {match.timeDifference}日
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              <PetsIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              種類
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {match.missingPet?.type}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* マッチした特徴 */}
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        一致した特徴
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {match.matchDetails.microchip === true && (
                          <Chip 
                            label="マイクロチップ番号が完全一致" 
                            size="small" 
                            color="error"
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                        {match.matchDetails.type === true && (
                          <Chip label="種類が一致" size="small" color="success" />
                        )}
                        {match.matchDetails.breed === true && (
                          <Chip label="犬種が一致" size="small" color="success" />
                        )}
                        {match.matchDetails.size === true && (
                          <Chip label="サイズが一致" size="small" color="success" />
                        )}
                        {(() => {
                          const validColors = match.matchDetails.color?.filter?.(
                            (color: any) => color && typeof color === 'string' && color.trim().length > 0
                          ) || [];
                          return validColors.map((color: string, i: number) => (
                            <Chip key={`color-${i}`} label={`色: ${color}`} size="small" color="info" />
                          ));
                        })()}
                        {(() => {
                          const validFeatures = match.matchDetails.features?.filter?.(
                            (feature: any) => feature && typeof feature === 'string' && feature.trim().length > 0
                          ) || [];
                          return validFeatures.map((feature: string, i: number) => (
                            <Chip key={`feature-${i}`} label={feature.trim()} size="small" variant="outlined" />
                          ));
                        })()}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}