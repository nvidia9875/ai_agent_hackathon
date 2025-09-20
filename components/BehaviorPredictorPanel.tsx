'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Switch, 
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Divider,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Slider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Pets as PetsIcon,
  LocationOn as LocationIcon,
  WbSunny as WeatherIcon,
  Schedule as TimeIcon,
  Warning as WarningIcon,
  Restaurant as FoodIcon,
  Water as WaterIcon,
  Home as ShelterIcon,
  Psychology as AIIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import type { 
  PetProfile, 
  PredictionResult,
  PredictionTimeFrame 
} from '@/lib/types/behavior-predictor';
import { BehaviorPredictor } from '@/lib/services/behavior-predictor';
import { WeatherService } from '@/lib/services/weather-service';

interface BehaviorPredictorPanelProps {
  onPredictionUpdate: (result: PredictionResult | null) => void;
  onTimeFrameChange: (hours: number) => void;
  onVisualizationSettingsChange: (settings: VisualizationSettings) => void;
}

interface VisualizationSettings {
  showHeatmap: boolean;
  showDangerZones: boolean;
  showPointsOfInterest: boolean;
}

const TIME_FRAMES: PredictionTimeFrame[] = [
  { hours: 1, label: '1時間以内' },
  { hours: 3, label: '3時間以内' },
  { hours: 6, label: '6時間以内' },
  { hours: 12, label: '12時間以内' },
  { hours: 24, label: '24時間以内' },
];

export default function BehaviorPredictorPanel({
  onPredictionUpdate,
  onTimeFrameChange,
  onVisualizationSettingsChange,
}: BehaviorPredictorPanelProps) {
  const [petProfile, setPetProfile] = useState<Partial<PetProfile>>({
    species: 'dog',
    size: 'medium',
    personality: [],
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(3);
  const [visualSettings, setVisualSettings] = useState<VisualizationSettings>({
    showHeatmap: true,
    showDangerZones: true,
    showPointsOfInterest: true,
  });
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [heatmapIntensity, setHeatmapIntensity] = useState(70);

  useEffect(() => {
    onVisualizationSettingsChange(visualSettings);
  }, [visualSettings, onVisualizationSettingsChange]);

  const handleAnalyze = async () => {
    if (!petProfile.species || !petProfile.size) {
      alert('ペットの種類とサイズを選択してください');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Firestoreから取得した実際の位置情報を使用
      // locationプロパティが存在する場合はそれを使用
      const actualLocation = petProfile.location || {
        lat: 35.6762,
        lng: 139.6503,
      };

      // Get weather data
      const weatherService = WeatherService.getInstance();
      const weather = await weatherService.getWeatherCondition(actualLocation.lat, actualLocation.lng);
      setWeatherData(weather);

      // Create complete pet profile
      const fullProfile: PetProfile = {
        id: petProfile.id || `pet-${Date.now()}`,
        name: petProfile.name || '不明',
        species: petProfile.species as 'dog' | 'cat',
        breed: petProfile.breed,
        age: petProfile.age,
        size: petProfile.size as 'small' | 'medium' | 'large',
        personality: petProfile.personality || [],
        lastSeenLocation: actualLocation,
        lastSeenTime: petProfile.lastSeenTime ? new Date(petProfile.lastSeenTime) : new Date(),
        weatherCondition: weather,
      };

      // Run prediction
      const predictor = new BehaviorPredictor(fullProfile);
      const result = await predictor.predictSearchArea(TIME_FRAMES);
      
      setPredictionResult(result);
      onPredictionUpdate(result);
    } catch (error) {
      console.error('Prediction error:', error);
      alert('予測中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTimeFrameChange = (hours: number) => {
    setSelectedTimeFrame(hours);
    onTimeFrameChange(hours);
  };

  const handleVisualizationToggle = (setting: keyof VisualizationSettings) => {
    const newSettings = {
      ...visualSettings,
      [setting]: !visualSettings[setting],
    };
    setVisualSettings(newSettings);
  };

  const handleExportReport = () => {
    if (!predictionResult) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      petProfile: predictionResult.petProfile,
      searchZones: predictionResult.searchZones,
      recommendations: predictionResult.recommendations,
      confidenceScore: predictionResult.confidenceScore,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pet-search-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          行動予測エージェント
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          AIがペットの行動パターンを分析し、捜索エリアを予測します
        </Typography>
      </Box>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="bold">
            <PetsIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            ペット情報
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>ペットの種類</InputLabel>
                <Select
                  value={petProfile.species || ''}
                  onChange={(e) => setPetProfile({ ...petProfile, species: e.target.value as 'dog' | 'cat' })}
                  label="ペットの種類"
                >
                  <MenuItem value="dog">犬</MenuItem>
                  <MenuItem value="cat">猫</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>サイズ</InputLabel>
                <Select
                  value={petProfile.size || ''}
                  onChange={(e) => setPetProfile({ ...petProfile, size: e.target.value as any })}
                  label="サイズ"
                >
                  <MenuItem value="small">小型（〜10kg）</MenuItem>
                  <MenuItem value="medium">中型（10-25kg）</MenuItem>
                  <MenuItem value="large">大型（25kg〜）</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>性格の特徴</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {['人懐っこい', '臆病', '活発', '大人しい'].map((trait) => (
                  <Chip
                    key={trait}
                    label={trait}
                    size="small"
                    color={petProfile.personality?.includes(trait) ? 'primary' : 'default'}
                    onClick={() => {
                      const newPersonality = petProfile.personality?.includes(trait)
                        ? petProfile.personality.filter(p => p !== trait)
                        : [...(petProfile.personality || []), trait];
                      setPetProfile({ ...petProfile, personality: newPersonality });
                    }}
                  />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="bold">
            <TimeIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            時間経過による予測
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>予測時間枠</InputLabel>
              <Select
                value={selectedTimeFrame}
                onChange={(e) => handleTimeFrameChange(Number(e.target.value))}
                label="予測時間枠"
              >
                {TIME_FRAMES.map((frame) => (
                  <MenuItem key={frame.hours} value={frame.hours}>
                    {frame.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {predictionResult && (
              <Alert severity="info" variant="outlined">
                <Typography variant="body2">
                  推定移動範囲: 半径{' '}
                  {(
                    (petProfile.species === 'dog' ? 4.5 : 2.5) * selectedTimeFrame * 0.8
                  ).toFixed(1)}
                  km
                </Typography>
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="bold">
            <LocationIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            表示設定
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={visualSettings.showHeatmap}
                  onChange={() => handleVisualizationToggle('showHeatmap')}
                />
              }
              label="ヒートマップを表示"
            />
            
            {visualSettings.showHeatmap && (
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" gutterBottom>
                  ヒートマップ強度: {heatmapIntensity}%
                </Typography>
                <Slider
                  value={heatmapIntensity}
                  onChange={(e, value) => setHeatmapIntensity(value as number)}
                  min={0}
                  max={100}
                  size="small"
                />
              </Box>
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={visualSettings.showDangerZones}
                  onChange={() => handleVisualizationToggle('showDangerZones')}
                />
              }
              label="危険エリアを表示"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={visualSettings.showPointsOfInterest}
                  onChange={() => handleVisualizationToggle('showPointsOfInterest')}
                />
              }
              label="注目ポイントを表示"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {weatherData && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">
              <WeatherIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
              天候の影響
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">現在の天候:</Typography>
                <Chip label={weatherData.condition} size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">気温:</Typography>
                <Typography variant="body2">{weatherData.temperature.toFixed(1)}°C</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">湿度:</Typography>
                <Typography variant="body2">{weatherData.humidity}%</Typography>
              </Box>
              {weatherData.precipitation && (
                <Alert severity="warning" variant="outlined">
                  <Typography variant="body2">
                    雨天のため、雨宿りできる場所を重点的に捜索してください
                  </Typography>
                </Alert>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      <Divider sx={{ my: 2 }} />

      <Stack spacing={2}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          startIcon={<AIIcon />}
        >
          {isAnalyzing ? '分析中...' : '行動予測を開始'}
        </Button>
        
        {isAnalyzing && <LinearProgress />}
        
        {predictionResult && (
          <Stack direction="row" spacing={1}>
            <Tooltip title="レポートをダウンロード">
              <IconButton onClick={handleExportReport} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="共有">
              <IconButton size="small">
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="更新">
              <IconButton onClick={handleAnalyze} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {predictionResult && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            推奨捜索戦略
          </Typography>
          <Stack spacing={1}>
            {predictionResult.recommendations.map((rec, index) => (
              <Alert key={index} severity="info" variant="outlined">
                <Typography variant="body2">{rec}</Typography>
              </Alert>
            ))}
          </Stack>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              信頼度スコア: {(predictionResult.confidenceScore * 100).toFixed(0)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              最終更新: {new Date(predictionResult.lastUpdated).toLocaleTimeString('ja-JP')}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}