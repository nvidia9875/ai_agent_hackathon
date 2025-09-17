'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
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
  Stack
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Pets as PetsIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { Paper } from '@mui/material';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';

interface LostPet {
  id: string;
  petName: string;
  petType: string;
  size: string;
  color: string;
  features: string;
  microchipNumber?: string;
  lastSeenDate: string;
  lastSeenAddress: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  imageUrls: string[];
  status: string;
  createdAt: any;
}

interface FoundPet {
  id: string;
  petType: string;
  size: string;
  color: string;
  features: string;
  hasCollar: boolean;
  collarDescription?: string;
  foundDate: string;
  foundAddress: string;
  currentLocation: string;
  petCondition: string;
  finderName: string;
  finderPhone: string;
  finderEmail?: string;
  imageUrls: string[];
  status: string;
  createdAt: any;
}

interface PotentialMatch {
  lostPet: LostPet;
  foundPet: FoundPet;
  matchScore: number;
  matchReasons: string[];
}

export default function PetMatchingCard() {
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [foundPets, setFoundPets] = useState<FoundPet[]>([]);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PotentialMatch | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const calculateMatches = () => {
    const matches: PotentialMatch[] = [];
    
    lostPets.forEach(lostPet => {
      foundPets.forEach(foundPet => {
        const { score, reasons } = calculateMatchScore(lostPet, foundPet);
        if (score >= 40) { // 40%以上の一致でマッチング候補に
          matches.push({
            lostPet,
            foundPet,
            matchScore: score,
            matchReasons: reasons
          });
        }
      });
    });
    
    // スコアの高い順にソート
    matches.sort((a, b) => b.matchScore - a.matchScore);
    setPotentialMatches(matches.slice(0, 10)); // 上位10件を表示
  };

  const calculateMatchScore = (lostPet: LostPet, foundPet: FoundPet): { score: number; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];
    
    // ペットの種類が一致
    if (lostPet.petType === foundPet.petType) {
      score += 30;
      reasons.push(`${lostPet.petType}で一致`);
    }
    
    // サイズが一致
    if (lostPet.size === foundPet.size) {
      score += 20;
      reasons.push('サイズが一致');
    }
    
    // 色が部分一致
    if (lostPet.color && foundPet.color && 
        (lostPet.color.toLowerCase().includes(foundPet.color.toLowerCase()) ||
         foundPet.color.toLowerCase().includes(lostPet.color.toLowerCase()))) {
      score += 20;
      reasons.push('毛色が類似');
    }
    
    // 場所の近さ（簡易的に住所の一部が一致するかチェック）
    const lostLocation = lostPet.lastSeenAddress.toLowerCase();
    const foundLocation = foundPet.foundAddress.toLowerCase();
    const locationParts = ['区', '市', '町', '丁目'];
    
    locationParts.forEach(part => {
      const lostParts = lostLocation.split(part)[0];
      const foundParts = foundLocation.split(part)[0];
      if (lostParts && foundParts && lostParts === foundParts) {
        score += 10;
        reasons.push(`場所が近い（同じ${part}）`);
      }
    });
    
    // 日付の近さ（7日以内）
    const lostDate = new Date(lostPet.lastSeenDate);
    const foundDate = new Date(foundPet.foundDate);
    const daysDiff = Math.abs(foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 7) {
      score += 20;
      reasons.push(`日付が近い（${Math.round(daysDiff)}日差）`);
    } else if (daysDiff <= 14) {
      score += 10;
      reasons.push(`日付差${Math.round(daysDiff)}日`);
    }
    
    // マイクロチップ番号が記載されている場合の特別処理
    if (lostPet.microchipNumber && foundPet.features?.includes(lostPet.microchipNumber)) {
      score = 100;
      reasons.unshift('マイクロチップ番号が一致！');
    }
    
    return { score: Math.min(score, 100), reasons };
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // 迷子ペットのリアルタイム取得
    const lostPetsQuery = query(
      collection(db, 'lostPets'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribeLost = onSnapshot(lostPetsQuery, (snapshot) => {
      const pets: LostPet[] = [];
      snapshot.forEach((doc) => {
        pets.push({ id: doc.id, ...doc.data() } as LostPet);
      });
      setLostPets(pets);
    });

    // 見つかったペットのリアルタイム取得
    const foundPetsQuery = query(
      collection(db, 'foundPets'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribeFound = onSnapshot(foundPetsQuery, (snapshot) => {
      const pets: FoundPet[] = [];
      snapshot.forEach((doc) => {
        pets.push({ id: doc.id, ...doc.data() } as FoundPet);
      });
      setFoundPets(pets);
    });

    return () => {
      unsubscribeLost();
      unsubscribeFound();
    };
  }, [mounted]);

  useEffect(() => {
    // マッチング候補を計算
    calculateMatches();
  }, [lostPets, foundPets]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const handleViewDetails = (match: PotentialMatch) => {
    setSelectedMatch(match);
    setDetailsOpen(true);
  };

  const handleMarkAsMatched = async (match: PotentialMatch) => {
    try {
      // 両方のステータスを更新
      await updateDoc(doc(db, 'lostPets', match.lostPet.id), {
        status: 'matched'
      });
      await updateDoc(doc(db, 'foundPets', match.foundPet.id), {
        status: 'matched'
      });
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating match status:', error);
    }
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            AIマッチング候補
          </Typography>
          <Chip 
            label={`${potentialMatches.length}件`} 
            color="primary" 
            size="small" 
          />
        </Box>

        {potentialMatches.length === 0 ? (
          <Alert severity="info">
            現在マッチング候補はありません。新しい報告があれば自動的に分析されます。
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {potentialMatches.map((match, index) => (
              <Grid item xs={12} key={index}>
                <Card sx={{ 
                  display: 'flex',
                  position: 'relative',
                  '&:hover': { boxShadow: 3 }
                }}>
                  {match.matchScore >= 80 && (
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
                    {/* マッチングスコアを上部に配置 */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: match.matchScore >= 80 ? 'error.50' : 'primary.50'
                    }}>
                      <Typography variant="h4" fontWeight="bold" color="primary" sx={{ mr: 1 }}>
                        {match.matchScore}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        一致率
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                      {/* 迷子ペット情報 */}
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {match.lostPet.imageUrls[0] && (
                          <CardMedia
                            component="img"
                            sx={{ width: 80, height: 80, borderRadius: 1, mr: 2 }}
                            image={match.lostPet.imageUrls[0]}
                            alt={match.lostPet.petName}
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            迷子のペット
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {match.lostPet.petName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.lostPet.petType} • {match.lostPet.size}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                              {match.lostPet.lastSeenAddress}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* 見つかったペット情報 */}
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {match.foundPet.imageUrls[0] && (
                          <CardMedia
                            component="img"
                            sx={{ width: 80, height: 80, borderRadius: 1, mr: 2 }}
                            image={match.foundPet.imageUrls[0]}
                            alt="Found pet"
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            発見されたペット
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {match.foundPet.petType}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.foundPet.size} • {match.foundPet.color}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                              {match.foundPet.foundAddress}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
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
                <Typography variant="h6">マッチング詳細</Typography>
                <IconButton onClick={() => setDetailsOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {selectedMatch.matchScore}%の確率でマッチング
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {selectedMatch.matchReasons.map((reason, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon fontSize="small" />
                      <Typography variant="body2">{reason}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Alert>

              <Grid container spacing={3}>
                {/* 迷子ペット詳細 */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      迷子のペット
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {selectedMatch.lostPet.imageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Lost pet ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            borderRadius: 8,
                            marginBottom: 8
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedMatch.lostPet.petName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedMatch.lostPet.petType} • {selectedMatch.lostPet.size} • {selectedMatch.lostPet.color}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedMatch.lostPet.features}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        飼い主情報
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <PhoneIcon fontSize="small" />
                        <Typography variant="body2">
                          {selectedMatch.lostPet.ownerPhone}
                        </Typography>
                      </Box>
                      {selectedMatch.lostPet.ownerEmail && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <EmailIcon fontSize="small" />
                          <Typography variant="body2">
                            {selectedMatch.lostPet.ownerEmail}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* 見つかったペット詳細 */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      発見されたペット
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {selectedMatch.foundPet.imageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Found pet ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            borderRadius: 8,
                            marginBottom: 8
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedMatch.foundPet.petType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedMatch.foundPet.size} • {selectedMatch.foundPet.color}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedMatch.foundPet.features}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      現在の場所: {selectedMatch.foundPet.currentLocation}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        発見者情報
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <PhoneIcon fontSize="small" />
                        <Typography variant="body2">
                          {selectedMatch.foundPet.finderPhone}
                        </Typography>
                      </Box>
                      {selectedMatch.foundPet.finderEmail && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <EmailIcon fontSize="small" />
                          <Typography variant="body2">
                            {selectedMatch.foundPet.finderEmail}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                閉じる
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleMarkAsMatched(selectedMatch)}
                startIcon={<CheckCircleIcon />}
              >
                マッチング確定
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}