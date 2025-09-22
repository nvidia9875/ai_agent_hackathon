'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
  Alert,
  CircularProgress,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  PhotoCamera as PhotoCameraIcon,
  Pets as PetsIcon,
  Send as SendIcon,
  MyLocation as MyLocationIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const Sidebar = dynamicImport(() => import('@/components/Sidebar'), { 
  ssr: false,
  loading: () => (
    <Box sx={{ 
      width: 240, 
      flexShrink: 0,
      backgroundColor: 'background.paper',
      borderRight: '1px solid',
      borderColor: 'divider'
    }} />
  )
});
import FormHeader from '@/components/FormHeader';

import { db, storage } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth/auth-context';
import { dogBreeds } from '@/lib/config/dog-breeds';
import { useSuccessNotification } from '@/lib/contexts/success-notification-context';

interface FoundPetData {
  // 見つけたペットの情報
  petType: string;
  petBreed: string;
  size: string;
  weight: string;
  color: string;
  features: string;
  microchipNumber: string;
  hasCollar: boolean;
  collarDescription: string;
  
  // 発見時の情報
  foundDate: string;
  foundTime: string;
  foundAddress: string;
  foundLocationDetails: string;
  currentLocation: string; // 現在の保護場所
  petCondition: string; // ペットの状態
  
  // 発見者の情報
  finderNickname: string;
  canKeepTemporarily: boolean; // 一時的に保護できるか
  keepUntilDate: string; // いつまで保護できるか
  
  // その他
  additionalInfo: string;
}

const initialFormData: FoundPetData = {
  petType: '',
  petBreed: '',
  size: '',
  weight: '',
  color: '',
  features: '',
  microchipNumber: '',
  hasCollar: false,
  collarDescription: '',
  foundDate: '',
  foundTime: '',
  foundAddress: '',
  foundLocationDetails: '',
  currentLocation: '',
  petCondition: '',
  finderNickname: '',
  canKeepTemporarily: false,
  keepUntilDate: '',
  additionalInfo: ''
};

const petTypes = ['犬', '猫', '鳥', 'うさぎ', 'ハムスター', 'その他'];
const petSizes = [
  '10cm未満',
  '10-30cm',
  '30-50cm',
  '50-70cm',
  '70-100cm',
  '100cm以上'
];
const petConditions = [
  '良好（元気そう）',
  '普通',
  '弱っている',
  '怪我をしている',
  '不明'
];

function FoundPetContent() {
  const [formData, setFormData] = useState<FoundPetData>(initialFormData);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FoundPetData, boolean>>>({});
  const [success, setSuccess] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const router = useRouter();
  const { showSuccess: showNotification, showError: showErrorNotification } = useSuccessNotification();

  const handleInputChange = (field: keyof FoundPetData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type === 'image/jpeg' || file.type === 'image/png'
    );
    
    if (images.length + validFiles.length > 5) {
      setError('画像は最大5枚までアップロードできます');
      return;
    }
    
    const newImages = [...images, ...validFiles];
    setImages(newImages);
    
    // プレビューURL生成
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviewUrls([...imagePreviewUrls, ...newPreviewUrls]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Geocoding APIを使用して住所を取得
        try {
          const response = await fetch(
            `/api/geocode?lat=${latitude}&lng=${longitude}`
          );
          const data = await response.json();
          
          if (data.address) {
            setFormData(prev => ({
              ...prev,
              foundAddress: data.address
            }));
          }
        } catch (error) {
          console.error('Error geocoding:', error);
          // 座標だけでも設定
          setFormData(prev => ({
            ...prev,
            foundAddress: `緯度: ${latitude.toFixed(6)}, 経度: ${longitude.toFixed(6)}`
          }));
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('現在位置を取得できませんでした');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5分間はキャッシュを使用
      }
    );
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FoundPetData, boolean>> = {};
    let hasError = false;
    
    if (images.length === 0) {
      setError('写真を最低1枚アップロードしてください');
      return false;
    }
    if (!formData.petType) {
      errors.petType = true;
      hasError = true;
    }
    if (!formData.foundAddress) {
      errors.foundAddress = true;
      hasError = true;
    }
    if (!formData.finderNickname) {
      errors.finderNickname = true;
      hasError = true;
    }
    if (formData.canKeepTemporarily && !formData.keepUntilDate) {
      errors.keepUntilDate = true;
      hasError = true;
    }
    
    if (hasError) {
      setError('ペットの種類、発見場所、ニックネームは必須です');
      setFieldErrors(errors);
      return false;
    }
    
    setError('');
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setFieldErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // 画像をFirebase Storageにアップロード
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const storageRef = ref(storage, `found-pets/${Date.now()}_${i}_${image.name}`);
        const snapshot = await uploadBytes(storageRef, image);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadUrl);
      }
      
      // Firestoreにデータを保存
      const docRef = await addDoc(collection(db, 'foundPets'), {
        ...formData,
        breed: formData.petBreed, // 犬種を保存
        weight: formData.weight ? parseFloat(formData.weight) : null, // 体重を数値として保存
        finderNickname: formData.finderNickname, // ニックネームを保存
        userId: user?.uid, // ユーザーIDを保存
        imageUrls,
        status: 'found', // found, matched, resolved
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('Document written with ID: ', docRef.id);
      
      // Visual Detective Agentによる自動マッチングを実行
      try {
        console.log('Starting AI auto-matching...');
        const matchResponse = await fetch('/api/auto-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            foundPetId: docRef.id,
          }),
        });
        
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          console.log(`AI matching completed. Found ${matchData.matchesFound} potential matches`);
        } else {
          console.warn('Auto-matching failed, but pet was successfully registered');
        }
      } catch (matchError) {
        console.error('Auto-matching error:', matchError);
        // マッチングに失敗してもペット登録は成功として扱う
      }
      
      // 成功通知を表示してすぐにリダイレクト
      showNotification('ペットの発見報告を登録しました。AIが自動的にマッチングを開始しています。');
      router.push('/');
      
    } catch (error: any) {
      console.error('Error adding document: ', error);
      setError('送信に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box sx={{ width: 240 }}>
        <Sidebar />
      </Box>
      
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto'
      }}>
        <FormHeader 
          title="ペットを見つけましたか？"
          subtitle="30秒で報告完了！AIが飼い主さんを探します"
        />
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          

          {/* 1. 写真アップロード - 最重要 */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 3, 
              border: images.length === 0 && error ? '2px solid' : '1px solid',
              borderColor: images.length === 0 && error ? 'error.main' : 'divider',
              borderRadius: 2,
              transition: 'all 0.3s ease'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhotoCameraIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h6" fontWeight="600">
                写真を撮影
              </Typography>
              <Chip label="必須" color="error" size="small" sx={{ ml: 1 }} />
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              ペットの写真があると、飼い主さんが見つかる確率が大幅に上がります
            </Alert>

            <Box sx={{ 
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: 'grey.50'
            }}>
              <PhotoCameraIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              
              <input
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                id="image-upload"
                multiple
                type="file"
                onChange={handleImageUpload}
                disabled={images.length >= 5}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={images.length >= 5}
                >
                  {images.length === 0 ? '写真を選択' : `追加で選択（${images.length}/5）`}
                </Button>
              </label>
              
              <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                最大5枚まで、JPG/PNG形式
              </Typography>
            </Box>
            
            {imagePreviewUrls.length > 0 && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {imagePreviewUrls.map((url, index) => (
                  <Grid item xs={4} sm={3} key={index}>
                    <Paper sx={{ 
                      position: 'relative',
                      paddingTop: '100%',
                      overflow: 'hidden',
                      borderRadius: 2
                    }}>
                      <Box
                        component="img"
                        src={url}
                        alt={`Found pet ${index + 1}`}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,1)'
                          }
                        }}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          {/* 2. 動物の種類 */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PetsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" fontWeight="600">
                  ペットの特徴
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required error={fieldErrors.petType}>
                    <InputLabel>動物の種類</InputLabel>
                    <Select
                      value={formData.petType}
                      onChange={(e) => {
                        handleInputChange('petType')(e);
                        // ペットタイプが犬以外の場合は犬種をクリア
                        if (e.target.value !== '犬') {
                          setFormData(prev => ({ ...prev, petBreed: '' }));
                        }
                      }}
                      label="動物の種類"
                    >
                      {petTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {fieldErrors.petType ? '必須項目です' : '該当する種類を選択'}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                {formData.petType === '犬' && (
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      value={formData.petBreed || null}
                      onChange={(event, newValue) => {
                        setFormData(prev => ({ ...prev, petBreed: newValue || '' }));
                      }}
                      options={dogBreeds}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="犬種"
                          helperText="犬種がわからない場合は「不明」を選択"
                        />
                      )}
                      fullWidth
                      disableClearable={false}
                      openOnFocus
                      autoHighlight
                      noOptionsText="該当する犬種が見つかりません"
                    />
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>サイズ（推定）</InputLabel>
                    <Select
                      value={formData.size}
                      onChange={(e) => handleInputChange('size')(e)}
                      label="サイズ（推定）"
                    >
                      {petSizes.map(size => (
                        <MenuItem key={size} value={size}>{size}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="推定体重"
                    type="number"
                    value={formData.weight}
                    onChange={handleInputChange('weight')}
                    placeholder="例: 5.5"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                    }}
                    helperText="おおよその体重"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="毛色・模様"
                    value={formData.color}
                    onChange={handleInputChange('color')}
                    placeholder="例: 茶色と白のぶち"
                    helperText="特徴的な色や模様"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="マイクロチップ番号"
                    value={formData.microchipNumber}
                    onChange={handleInputChange('microchipNumber')}
                    placeholder="15桁の番号（わかる場合）"
                    helperText="首輪や体に記載されている場合があります"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasCollar}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hasCollar: e.target.checked
                        }))}
                      />
                    }
                    label="首輪をしている"
                  />
                </Grid>

                {formData.hasCollar && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="首輪の特徴"
                      value={formData.collarDescription}
                      onChange={handleInputChange('collarDescription')}
                      placeholder="色、素材、名前タグの有無など"
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="その他の特徴"
                    value={formData.features}
                    onChange={handleInputChange('features')}
                    placeholder="特徴的な見た目、行動など"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 3. 発見場所と時間 */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" fontWeight="600">
                  発見情報
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="発見場所"
                    value={formData.foundAddress}
                    onChange={handleInputChange('foundAddress')}
                    error={fieldErrors.foundAddress}
                    placeholder="例: 東京都渋谷区道玄坂1-2-3"
                    required
                    helperText={fieldErrors.foundAddress ? '必須項目です' : 'できるだけ詳しい住所'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={getCurrentLocation}
                            disabled={gettingLocation}
                            startIcon={gettingLocation ? <CircularProgress size={16} /> : <MyLocationIcon />}
                          >
                            現在地
                          </Button>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="発見日"
                    value={formData.foundDate}
                    onChange={handleInputChange('foundDate')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    error={fieldErrors.foundDate}
                    required
                    helperText={fieldErrors.foundDate ? '必須項目です' : '発見した日付を選択（マッチングに使用されます）'}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="発見時刻"
                    value={formData.foundTime}
                    onChange={handleInputChange('foundTime')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccessTimeIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    error={fieldErrors.foundTime}
                    required
                    helperText={fieldErrors.foundTime ? '必須項目です' : '発見した時間を選択（マッチングに使用されます）'}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>ペットの状態</InputLabel>
                    <Select
                      value={formData.petCondition}
                      onChange={(e) => handleInputChange('petCondition')(e)}
                      label="ペットの状態"
                    >
                      {petConditions.map(condition => (
                        <MenuItem key={condition} value={condition}>{condition}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 4. ニックネーム */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PetsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" fontWeight="600">
                  ニックネーム登録
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                チャットで飼い主さんとやり取りする際に使用するニックネームを設定してください。
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ニックネーム"
                    value={formData.finderNickname}
                    onChange={handleInputChange('finderNickname')}
                    error={fieldErrors.finderNickname}
                    placeholder="例: ペット発見者"
                    required
                    helperText="チャットで表示される名前です"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PetsIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="保護について" size="small" />
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.canKeepTemporarily}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          canKeepTemporarily: e.target.checked
                        }))}
                      />
                    }
                    label="一時的に保護できます"
                  />
                </Grid>

                {formData.canKeepTemporarily && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="保護可能な期限"
                        value={formData.keepUntilDate}
                        onChange={handleInputChange('keepUntilDate')}
                        error={fieldErrors.keepUntilDate}
                        InputLabelProps={{ shrink: true }}
                        helperText={fieldErrors.keepUntilDate ? '保護期限を入力してください' : 'いつまで保護可能か'}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="現在の保護場所"
                        value={formData.currentLocation}
                        onChange={handleInputChange('currentLocation')}
                        placeholder="例: 自宅、動物病院など"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <HomeIcon fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* 送信ボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/')}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 4,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b4199 100%)',
                }
              }}
            >
              {loading ? '送信中...' : 'AIに報告する'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function FoundPetPageWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5' 
      }}>
        <div style={{ 
          width: '240px', 
          flexShrink: 0,
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0'
        }} />
        <div style={{ 
          flex: 1, 
          backgroundColor: '#f5f5f5',
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '16px', color: '#666' }}>読み込み中...</div>
        </div>
      </div>
    );
  }

  return <FoundPetContent />;
}

export default FoundPetPageWrapper;