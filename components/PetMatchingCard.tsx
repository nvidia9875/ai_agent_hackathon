'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Box,
  Chip,
  Button,
  Grid,
  Alert,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  LinearProgress,
  CircularProgress,
  Divider,
  Skeleton
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Pets as PetsIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Forum as ForumIcon
} from '@mui/icons-material';
import { Paper } from '@mui/material';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface DetailedScoreItem {
  category: string;
  score: number;
  missingValue: string;
  foundValue: string;
  weight: number;
  description: string;
  weightedScore: number;
}

interface DetailedScores {
  scores: Record<string, {
    score: number;
    missingValue: string;
    foundValue: string;
    weight: number;
    description: string;
  }>;
  overallScore: number;
  totalWeight: number;
  breakdown: DetailedScoreItem[];
}

interface MatchResult {
  id: string;
  missingPetId: string;
  foundPetId: string;
  matchScore: number;
  visualSimilarity: number;
  locationProximity: number;
  timeDifference: number;
  matchDetails: {
    type: boolean;
    size: boolean;
    color: string[];
    features: string[];
  };
  recommendedAction: 'high_match' | 'possible_match' | 'low_match';
  confidence: number;
  detailedScores?: DetailedScores;
  missingPet?: {
    id: string;
    name: string;
    type: string;
    size: string;
    color?: string;
    colors: string[];
    hasCollar?: boolean;
    collarColor?: string;
    lastSeen: {
      location: string;
      date: string;
      time?: string;
    };
    contactInfo: {
      name: string;
      phone: string;
      email?: string;
    };
    images: string[];
  };
  foundPet?: {
    id: string;
    petType: string;
    size: string;
    color: string;
    foundAddress: string;
    foundDate: string;
    finderName: string;
    finderPhone: string;
    finderEmail?: string;
    imageUrls: string[];
  };
  createdAt: Date | { seconds: number; nanoseconds: number };
  status?: string;
}

// 画像ローディングコンポーネント
function ImageWithLoading({ 
  src, 
  alt, 
  style, 
  skeletonHeight = 80 
}: { 
  src: string; 
  alt: string; 
  style: React.CSSProperties; 
  skeletonHeight?: number;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: skeletonHeight }}>
      {!imageLoaded && !imageError && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={skeletonHeight}
          sx={{ borderRadius: style.borderRadius }}
        />
      )}
      {!imageError && (
        <img
          src={src}
          alt={alt}
          style={{
            ...style,
            display: imageLoaded ? 'block' : 'none'
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      {imageError && (
        <Box
          sx={{
            width: '100%',
            height: skeletonHeight,
            backgroundColor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: style.borderRadius,
            color: 'text.secondary'
          }}
        >
          <Typography variant="caption">画像読み込みエラー</Typography>
        </Box>
      )}
    </Box>
  );
}

export default function PetMatchingCard() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    fetchMatches();

    // リアルタイムでマッチング結果を監視
    const matchesQuery = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchData: MatchResult[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as MatchResult;
        // 解決済みのマッチングは除外
        if (data.status !== 'resolved') {
          matchData.push({ id: doc.id, ...data });
        }
      });
      
      // スコアの高い順にソート
      matchData.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(matchData);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [mounted]);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        if (data.matches) {
          // 解決済みのマッチングを除外
          const activeMatches = data.matches.filter((match: MatchResult) => match.status !== 'resolved');
          setMatches(activeMatches);
        }
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleViewDetails = (match: MatchResult) => {
    setSelectedMatch(match);
    setDetailsOpen(true);
  };

  const handleMarkAsMatched = async (match: MatchResult) => {
    try {
      // マッチング結果のステータスを更新
      await updateDoc(doc(db, 'matches', match.id), {
        status: 'confirmed',
        updatedAt: new Date()
      });
      
      // 迷子ペットのステータスを更新
      if (match.missingPetId) {
        await updateDoc(doc(db, 'pets', match.missingPetId), {
          status: 'reunited'
        });
      }
      
      // 発見ペットのステータスを更新
      if (match.foundPetId) {
        await updateDoc(doc(db, 'foundPets', match.foundPetId), {
          status: 'claimed'
        });
      }
      
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating match status:', error);
    }
  };

  const getMatchBadgeColor = (score: number) => {
    if (score >= 75) return 'error';
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
        return <AutoAwesomeIcon sx={{ color: 'info.main' }} />;
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

  const handleStartChat = async () => {
    if (!selectedMatch || !user) return;
    
    setCreatingChat(true);
    try {
      // 迷子ペットと発見ペットのデータを取得してニックネームを確認
      const missingPetDoc = await getDoc(doc(db, 'pets', selectedMatch.missingPetId));
      const foundPetDoc = await getDoc(doc(db, 'foundPets', selectedMatch.foundPetId));
      
      if (!missingPetDoc.exists() || !foundPetDoc.exists()) {
        console.error('Pet documents not found');
        return;
      }
      
      const missingPetData = missingPetDoc.data();
      const foundPetData = foundPetDoc.data();
      
      // 同じユーザーが両方のペットを登録している場合はチャットを開始しない
      const ownerId = missingPetData.userId;
      const finderId = foundPetData.userId;
      
      if (!ownerId || !finderId) {
        alert('ユーザー情報が見つかりません。ログインしてから再度お試しください。');
        return;
      }
      
      if (ownerId === finderId) {
        alert('あなたが登録した迷子のペットとあなたが発見したペットが一致している可能性があります。');
        return;
      }
      
      // チャットルームを作成
      const response = await fetch('/api/chat/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petId: selectedMatch.missingPetId,
          ownerId: ownerId,
          finderId: finderId,
          ownerNickname: missingPetData.ownerNickname || '飼い主',
          finderNickname: foundPetData.finderNickname || '発見者',
          petName: missingPetData.name || missingPetData.petName || 'ペット'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // チャットページへ遷移
        router.push(`/chat?roomId=${data.roomId}`);
      } else {
        console.error('Failed to create chat room');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setCreatingChat(false);
    }
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">
              AI Visual Detective マッチング
            </Typography>
            <Chip 
              label={`${matches.length}件`} 
              color="primary" 
              size="small" 
            />
          </Box>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon className={refreshing ? 'rotating' : ''} />
          </IconButton>
        </Box>

        {matches.length === 0 ? (
          <Alert severity="info">
            現在マッチング候補はありません。新しい報告があれば自動的にAIが分析します。
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {matches.map((match, index) => (
              <Grid item xs={12} key={match.id || index}>
                <Card sx={{ 
                  display: 'flex',
                  position: 'relative',
                  '&:hover': { boxShadow: 3 },
                  borderLeft: match.matchScore >= 75 ? '4px solid' : 'none',
                  borderLeftColor: 'success.main'
                }}>
                  {match.matchScore >= 75 && (
                    <Badge
                      badgeContent="高確率"
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        '& .MuiBadge-badge': {
                          fontSize: '0.75rem',
                          height: 24,
                          minWidth: 60
                        }
                      }}
                    />
                  )}
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* マッチングスコアとAI分析結果 */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 2,
                      px: 3,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: match.matchScore >= 75 ? 'success.50' : 
                               match.matchScore >= 50 ? 'warning.50' : 'grey.50'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getMatchIcon(match.recommendedAction)}
                        <Box>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            {match.matchScore}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            AI信頼度: {match.confidence && !isNaN(match.confidence) ? Math.round(match.confidence * 100) : 50}%
                          </Typography>
                        </Box>
                        <Chip 
                          label={getActionText(match.recommendedAction)}
                          color={getMatchBadgeColor(match.matchScore)}
                          size="small"
                        />
                      </Box>
                      
                      {/* AI分析メトリクス */}
                      <Box sx={{ display: 'flex', gap: 3, mr: 10 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            視覚的類似度
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {match.visualSimilarity || 0}%
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            <LocationIcon sx={{ fontSize: 14 }} /> 距離
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {match.locationProximity || 0}%
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            <ScheduleIcon sx={{ fontSize: 14 }} /> 時間差
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {match.timeDifference || 0}日
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
                      {/* 迷子ペット情報 */}
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        {match.missingPet?.images?.[0] && (
                          <Box sx={{ width: 100, height: 100, mr: 2 }}>
                            <ImageWithLoading
                              src={match.missingPet.images[0]}
                              alt={match.missingPet.name || '迷子ペット'}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: 8
                              }}
                              skeletonHeight={100}
                            />
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            迷子のペット
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {match.missingPet?.name || match.missingPetName || '名前不明'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.missingPet?.type || match.missingPetType || '種類不明'} • {match.missingPet?.size || 'サイズ不明'}
                          </Typography>
                          {match.missingPet?.lastSeen && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <LocationIcon fontSize="small" color="action" />
                              <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                                {match.missingPet.lastSeen.location}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* 見つかったペット情報 */}
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        {match.foundPet?.imageUrls?.[0] && (
                          <Box sx={{ width: 100, height: 100, mr: 2 }}>
                            <ImageWithLoading
                              src={match.foundPet.imageUrls[0]}
                              alt="Found pet"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: 8
                              }}
                              skeletonHeight={100}
                            />
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            発見されたペット
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {match.foundPet?.petType || match.foundPetType || '種類不明'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.foundPet?.size || 'サイズ不明'} • {match.foundPet?.color || '色不明'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                              {match.foundPet?.foundAddress || '場所不明'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* マッチした特徴 */}
                    {match.matchDetails && (
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {match.matchDetails.type && (
                            <Chip label="種類が一致" size="small" color="success" />
                          )}
                          {match.matchDetails.size && (
                            <Chip label="サイズが一致" size="small" color="success" />
                          )}
                          {match.matchDetails.color?.map((color, i) => (
                            <Chip key={i} label={`色: ${color}`} size="small" color="info" />
                          ))}
                          {match.matchDetails.features?.map((feature, i) => (
                            <Chip key={i} label={feature} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* アクションボタン */}
                  <Box sx={{ 
                    position: 'absolute',
                    bottom: 8,
                    right: 8
                  }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleViewDetails(match)}
                    >
                      詳細を見る
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* 詳細ダイアログ */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMatch && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">AIマッチング詳細</Typography>
                <IconButton onClick={() => setDetailsOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Alert severity={selectedMatch.matchScore >= 75 ? 'success' : 'info'} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Visual Detective AIによる分析結果: {selectedMatch.matchScore}%の確率でマッチング
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  AI信頼度: {selectedMatch.confidence && !isNaN(selectedMatch.confidence) ? Math.round(selectedMatch.confidence * 100) : 50}%
                </Typography>
              </Alert>

              {/* 詳細スコア内訳 */}
              {selectedMatch.detailedScores && (
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon color="primary" />
                    詳細マッチング分析 (100%中{selectedMatch.detailedScores.overallScore}%)
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {selectedMatch.detailedScores.breakdown.map((item: DetailedScoreItem, index: number) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Box sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: 'divider', 
                          borderRadius: 2,
                          bgcolor: 'white'
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {item.description}
                            </Typography>
                            <Chip 
                              label={`${item.score}%`}
                              size="small"
                              color={item.score >= 80 ? 'success' : item.score >= 50 ? 'warning' : 'default'}
                            />
                          </Box>
                          
                          <LinearProgress
                            variant="determinate"
                            value={item.score}
                            sx={{ 
                              mb: 1, 
                              height: 6,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: item.score >= 80 ? 'success.main' : 
                                        item.score >= 50 ? 'warning.main' : 'error.main'
                              }
                            }}
                          />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">迷子:</Typography>
                              <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 500 }}>
                                {item.missingValue || '情報なし'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">発見:</Typography>
                              <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 500 }}>
                                {item.foundValue || '情報なし'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            重み: {item.weight}% | 得点: {item.weightedScore}pts
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* AI分析の詳細 */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  AI視覚解析の詳細
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        視覚的類似度
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={selectedMatch.visualSimilarity || 0}
                        sx={{ mt: 0.5, mb: 0.5 }}
                        color={(selectedMatch.visualSimilarity || 0) >= 70 ? 'success' : 'warning'}
                      />
                      <Typography variant="body2">
                        {selectedMatch.visualSimilarity || 0}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        場所の近さ
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={selectedMatch.locationProximity || 0}
                        sx={{ mt: 0.5, mb: 0.5 }}
                      />
                      <Typography variant="body2">
                        {selectedMatch.locationProximity || 0}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        時間差
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {selectedMatch.timeDifference || 0}日
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* 詳細なペット情報比較テーブル */}
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2, mb: 2 }}>
                🔍 詳細情報比較
              </Typography>
              
              <Paper sx={{ p: 3, mb: 3 }}>
                {/* ヘッダー */}
                <Grid container spacing={2} sx={{ mb: 2, py: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PetsIcon />
                      迷子のペット
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      マッチ度
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon />
                      発見されたペット
                    </Typography>
                  </Grid>
                </Grid>

                {/* 写真比較 */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
                    📷 写真
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={4}>
                      {selectedMatch.missingPet?.images && selectedMatch.missingPet.images.length > 0 ? (
                        <Grid container spacing={1}>
                          {selectedMatch.missingPet.images.slice(0, 4).map((url: string, idx: number) => (
                            <Grid item xs={6} key={idx}>
                              <ImageWithLoading
                                src={url}
                                alt={`Lost pet ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: 80,
                                  objectFit: 'cover',
                                  borderRadius: 4
                                }}
                                skeletonHeight={80}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">写真なし</Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'center' }}>
                      <Chip 
                        label={`${selectedMatch.visualSimilarity || 0}%`}
                        size="small"
                        color={(selectedMatch.visualSimilarity || 0) >= 70 ? 'success' : 'info'}
                        icon={<AutoAwesomeIcon />}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        視覚的類似度
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      {selectedMatch.foundPet?.imageUrls && selectedMatch.foundPet.imageUrls.length > 0 ? (
                        <Grid container spacing={1}>
                          {selectedMatch.foundPet.imageUrls.slice(0, 4).map((url: string, idx: number) => (
                            <Grid item xs={6} key={idx}>
                              <ImageWithLoading
                                src={url}
                                alt={`Found pet ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: 80,
                                  objectFit: 'cover',
                                  borderRadius: 4
                                }}
                                skeletonHeight={80}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">写真なし</Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* 比較テーブル */}
                {selectedMatch.detailedScores?.breakdown ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
                      📊 項目別比較
                    </Typography>
                    {selectedMatch.detailedScores.breakdown.map((item: DetailedScoreItem, index: number) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {item.description}
                            </Typography>
                            <Typography variant="body1" fontWeight="500">
                              {item.missingValue || '情報なし'}
                            </Typography>
                          </Grid>
                          <Grid item xs={4} sx={{ textAlign: 'center' }}>
                            <Chip 
                              label={`${item.score}%`}
                              size="small"
                              color={item.score >= 80 ? 'success' : item.score >= 50 ? 'warning' : 'default'}
                              sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}
                            />
                            <LinearProgress
                              variant="determinate"
                              value={item.score}
                              sx={{ 
                                mt: 1,
                                height: 4,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: item.score >= 80 ? 'success.main' : 
                                          item.score >= 50 ? 'warning.main' : 'error.main'
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {item.description}
                            </Typography>
                            <Typography variant="body1" fontWeight="500">
                              {item.foundValue || '情報なし'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
                      📊 基本比較情報
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      AIによる詳細スコア情報が利用できません。基本的な比較結果を表示しています。
                    </Alert>
                    
                    {/* 基本情報の比較 */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>動物の種類</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.missingPet?.type || selectedMatch.missingPetType || '不明'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={
                              (selectedMatch.missingPet?.type || selectedMatch.missingPetType)?.toLowerCase() === 
                              (selectedMatch.foundPet?.petType || selectedMatch.foundPetType)?.toLowerCase() 
                                ? "100%" : "0%"
                            }
                            size="small"
                            color={
                              (selectedMatch.missingPet?.type || selectedMatch.missingPetType)?.toLowerCase() === 
                              (selectedMatch.foundPet?.petType || selectedMatch.foundPetType)?.toLowerCase() 
                                ? 'success' : 'default'
                            }
                            sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>動物の種類</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.foundPet?.petType || selectedMatch.foundPetType || '不明'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>サイズ</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.missingPet?.size || '不明'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={selectedMatch.missingPet?.size === selectedMatch.foundPet?.size ? "100%" : "0%"}
                            size="small"
                            color={selectedMatch.missingPet?.size === selectedMatch.foundPet?.size ? "success" : "default"}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>サイズ</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.foundPet?.size || '不明'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>毛色</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.missingPet?.colors?.join(', ') || selectedMatch.missingPet?.color || '不明'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={
                              selectedMatch.missingPet?.color && selectedMatch.foundPet?.color &&
                              selectedMatch.missingPet.color.toLowerCase() === selectedMatch.foundPet.color.toLowerCase() 
                                ? "100%" : "0%"
                            }
                            size="small"
                            color={
                              selectedMatch.missingPet?.color && selectedMatch.foundPet?.color &&
                              selectedMatch.missingPet.color.toLowerCase() === selectedMatch.foundPet.color.toLowerCase() 
                                ? "success" : "default"
                            }
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>毛色</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.foundPet?.color || '不明'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>首輪</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.missingPet?.hasCollar ? 
                              `あり${selectedMatch.missingPet?.collarColor ? ` (${selectedMatch.missingPet.collarColor})` : ''}` : 
                              'なし'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={
                              (selectedMatch.missingPet?.hasCollar === selectedMatch.foundPet?.hasCollar) ? "100%" : "0%"
                            }
                            size="small"
                            color={
                              (selectedMatch.missingPet?.hasCollar === selectedMatch.foundPet?.hasCollar) ? "success" : "default"
                            }
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>首輪</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {selectedMatch.foundPet?.hasCollar ? 
                              `あり${selectedMatch.foundPet?.collarDescription ? ` (${selectedMatch.foundPet.collarDescription})` : ''}` : 
                              'なし'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* 連絡先情報 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
                    👤 連絡先情報
                  </Typography>
                  
                  {/* チャット開始セクション */}
                  <Box sx={{ mb: 2, p: 3, bgcolor: 'primary.50', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                      マッチング確率が高いため、直接連絡を取ってみましょう
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={creatingChat ? <CircularProgress size={20} color="inherit" /> : <ForumIcon />}
                      onClick={handleStartChat}
                      disabled={creatingChat}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b4199 100%)',
                        }
                      }}
                    >
                      {creatingChat ? 'チャットを作成中...' : 'チャットを開始する'}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                      サイト内のチャット機能で安全にやり取りができます
                    </Typography>
                  </Box>


                  {/* 場所・日時比較 */}
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>最後の目撃情報</Typography>
                        {selectedMatch.missingPet?.lastSeen && (
                          <Stack spacing={0.5}>
                            <Typography variant="body2">📍 {selectedMatch.missingPet.lastSeen.location || '不明'}</Typography>
                            <Typography variant="body2">📅 {selectedMatch.missingPet.lastSeen.date || '不明'}</Typography>
                            {selectedMatch.missingPet.lastSeen.time && (
                              <Typography variant="body2">🕐 {selectedMatch.missingPet.lastSeen.time}</Typography>
                            )}
                          </Stack>
                        )}
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: 'center' }}>
                        <Chip 
                          label={`${selectedMatch.detailedScores?.scores?.location?.score || 0}%`}
                          size="small"
                          color={(selectedMatch.detailedScores?.scores?.location?.score || 0) >= 50 ? 'success' : 'warning'}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>発見情報</Typography>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">📍 {selectedMatch.foundPet?.foundAddress || '不明'}</Typography>
                          <Typography variant="body2">📅 {selectedMatch.foundPet?.foundDate || '不明'}</Typography>
                          {selectedMatch.foundPet?.foundTime && (
                            <Typography variant="body2">🕐 {selectedMatch.foundPet.foundTime}</Typography>
                          )}
                          {selectedMatch.foundPet?.currentLocation && (
                            <Typography variant="body2">🏠 保護場所: {selectedMatch.foundPet.currentLocation}</Typography>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                閉じる
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <style jsx global>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </>
  );
}