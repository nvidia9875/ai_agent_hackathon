'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Chip,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  InputAdornment
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Pets as PetsIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  PhotoCamera as PhotoCameraIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Send as SendIcon
} from '@mui/icons-material';
import Sidebar from '@/components/Sidebar';
import FormHeader from '@/components/FormHeader';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { db, storage } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth/auth-context';
import { dogBreeds } from '@/lib/config/dog-breeds';
import { useSuccessNotification } from '@/lib/contexts/success-notification-context';

interface PetData {
  // ペット情報
  petName: string;
  petType: string;
  petBreed: string;
  ageYears: string;
  ageMonths: string;
  ageUnknown: boolean;
  size: string;
  weight: string;
  color: string;
  personality: string[];
  features: string;
  microchipNumber: string;
  hasCollar: boolean;
  collarColor: string;
  
  // 最後に見た情報
  lastSeenDate: string;
  lastSeenTime: string;
  lastSeenAddress: string;
  lastSeenDetails: string;
  lostReason: string;
  additionalInfo: string;
  
  // 飼い主情報
  ownerNickname: string;
}

const initialFormData: PetData = {
  petName: '',
  petType: '',
  petBreed: '',
  ageYears: '',
  ageMonths: '',
  ageUnknown: false,
  size: '',
  weight: '',
  color: '',
  personality: [],
  features: '',
  microchipNumber: '',
  hasCollar: false,
  collarColor: '',
  lastSeenDate: '',
  lastSeenTime: '',
  lastSeenAddress: '',
  lastSeenDetails: '',
  lostReason: '',
  additionalInfo: '',
  ownerNickname: ''
};

const petTypes = ['犬', '猫', '鳥', 'うさぎ', 'その他'];
const petSizes = [
  '10cm未満',
  '10-30cm',
  '30-50cm',
  '50-70cm',
  '70-100cm',
  '100cm以上'
];
const personalityOptions = [
  '人懐っこい',
  '臆病',
  '活発',
  '大人しい',
  '好奇心旺盛',
  '警戒心が強い',
  '独立心が強い',
  '甘えん坊',
  '遊び好き',
  '忠実',
  '社交的',
  '内向的'
];
const lostReasons = [
  '散歩中に逃げた',
  '家から脱走',
  '雷や花火で驚いて逃げた',
  '車から逃げた',
  '預け先から逃げた',
  'その他'
];

// 年齢選択用の配列
const years = Array.from({ length: 21 }, (_, i) => i.toString()); // 0-20年
const months = Array.from({ length: 12 }, (_, i) => i.toString()); // 0-11ヶ月

const steps = ['ペット情報', '写真', '最後の目撃情報', 'ニックネーム登録'];

function UploadPetContent() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<PetData>(initialFormData);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PetData, boolean>>>({});
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess: showNotification, showError } = useSuccessNotification();

  const handleInputChange = (field: keyof PetData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type === 'image/jpeg' || file.type === 'image/png'
    );
    
    if (images.length + validFiles.length > 10) {
      setError('画像は最大10枚までアップロードできます');
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

  const validateStep = (step: number): boolean => {
    const errors: Partial<Record<keyof PetData, boolean>> = {};
    let hasError = false;
    
    switch (step) {
      case 0: // ペット情報
        if (!formData.petName) {
          errors.petName = true;
          hasError = true;
        }
        if (!formData.petType) {
          errors.petType = true;
          hasError = true;
        }
        // 犬の場合は犬種も必須
        if (formData.petType === '犬' && !formData.petBreed) {
          errors.petBreed = true;
          hasError = true;
        }
        if (hasError) {
          const errorMsg = formData.petType === '犬' && !formData.petBreed 
            ? 'ペットの名前、種類、犬種は必須です'
            : 'ペットの名前と種類は必須です';
          setError(errorMsg);
          setFieldErrors(errors);
          return false;
        }
        break;
      case 1: // 写真
        if (images.length < 2) {
          setError('画像は最低2枚必要です');
          return false;
        }
        break;
      case 2: // 最後の目撃情報
        if (!formData.lastSeenDate) {
          errors.lastSeenDate = true;
          hasError = true;
        }
        if (!formData.lastSeenTime) {
          errors.lastSeenTime = true;
          hasError = true;
        }
        if (!formData.lastSeenAddress) {
          errors.lastSeenAddress = true;
          hasError = true;
        }
        if (hasError) {
          setError('最後に見た日付、時間、場所はすべて必須です');
          setFieldErrors(errors);
          return false;
        }
        break;
      case 3: // ニックネーム
        if (!formData.ownerNickname) {
          errors.ownerNickname = true;
          hasError = true;
        }
        if (hasError) {
          setError('ニックネームは必須です');
          setFieldErrors(errors);
          return false;
        }
        break;
    }
    setError('');
    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
    setFieldErrors({});
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!validateStep(3)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // 画像をFirebase Storageにアップロード
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const storageRef = ref(storage, `pets/${user?.uid}/${Date.now()}_${i}_${image.name}`);
        const snapshot = await uploadBytes(storageRef, image);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadUrl);
      }
      
      // Firestoreにデータを保存
      const docRef = await addDoc(collection(db, 'pets'), {
        ...formData,
        images: imageUrls, // imageUrlsをimagesに変更してPetMatcherと互換性を保つ
        name: formData.petName, // petNameをnameに変更
        type: formData.petType, // petTypeをtypeに変更
        breed: formData.petBreed, // 犬種を保存
        weight: formData.weight ? parseFloat(formData.weight) : null, // 体重を数値として保存
        colors: formData.color ? [formData.color] : [], // colorを配列形式に変換
        specialFeatures: formData.features, // featuresをspecialFeaturesに変更
        hasCollar: formData.hasCollar, // 首輪の有無を保存
        collarColor: formData.collarColor, // 首輪の色を保存
        lastSeen: {
          date: formData.lastSeenDate,
          time: formData.lastSeenTime,
          location: formData.lastSeenAddress,
          details: formData.lastSeenDetails
        },
        ownerNickname: formData.ownerNickname, // ニックネームを保存
        userId: user?.uid,
        userEmail: user?.email,
        status: 'missing', // 自動マッチング用のステータス
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('Document written with ID: ', docRef.id);
      
      // Visual Detective Agentによる自動マッチングを実行（発見ペットと照合）
      try {
        console.log('Starting AI auto-matching for missing pet...');
        const matchResponse = await fetch('/api/auto-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            missingPetId: docRef.id, // 新しく登録した迷子ペットのIDを送信
          }),
        });
        
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          console.log(`AI matching completed for missing pet. Found ${matchData.matchesFound} potential matches`);
        } else {
          console.warn('Auto-matching failed, but pet was successfully registered');
        }
      } catch (matchError) {
        console.error('Auto-matching error:', matchError);
        // マッチングに失敗してもペット登録は成功として扱う
      }
      
      // 成功通知を表示してすぐにリダイレクト
      showNotification(`${formData.petName}を迷子ペットとして登録しました。AIが自動的にマッチングを開始しています。`);
      router.push('/');
      
    } catch (error: any) {
      console.error('Error adding document: ', error);
      setError('登録に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PetsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h5" fontWeight="600">
                  ペットの基本情報
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="ペットの名前"
                    value={formData.petName}
                    onChange={handleInputChange('petName')}
                    required
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PetsIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="普段呼んでいる名前を入力してください"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>ペットの種類</InputLabel>
                    <Select
                      value={formData.petType}
                      onChange={(e) => {
                        handleInputChange('petType')(e);
                        // ペットタイプが犬以外の場合は犬種をクリア
                        if (e.target.value !== '犬') {
                          setFormData(prev => ({ ...prev, petBreed: '' }));
                        }
                      }}
                      label="ペットの種類"
                    >
                      {petTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>該当する種類を選択してください</FormHelperText>
                  </FormControl>
                </Grid>
                
                {formData.petType === '犬' && (
                  <Grid item xs={12}>
                    <Autocomplete
                      value={formData.petBreed || null}
                      onChange={(event, newValue) => {
                        setFormData(prev => ({ ...prev, petBreed: newValue || '' }));
                      }}
                      options={dogBreeds}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="犬種を選択"
                          required
                          error={fieldErrors.petBreed}
                          helperText={fieldErrors.petBreed ? '犬種は必須です' : '犬種を選択または検索してください（わからない場合は「不明」を選択）'}
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
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="年齢情報" size="small" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <FormControl sx={{ minWidth: 120 }} disabled={formData.ageUnknown}>
                      <InputLabel>年</InputLabel>
                      <Select
                        value={formData.ageYears}
                        onChange={(e) => handleInputChange('ageYears')(e)}
                        label="年"
                      >
                        {years.map(year => (
                          <MenuItem key={year} value={year}>{year}年</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl sx={{ minWidth: 120 }} disabled={formData.ageUnknown}>
                      <InputLabel>月</InputLabel>
                      <Select
                        value={formData.ageMonths}
                        onChange={(e) => handleInputChange('ageMonths')(e)}
                        label="月"
                      >
                        {months.map(month => (
                          <MenuItem key={month} value={month}>{month}ヶ月</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.ageUnknown}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            ageUnknown: e.target.checked,
                            ageYears: e.target.checked ? '' : prev.ageYears,
                            ageMonths: e.target.checked ? '' : prev.ageMonths
                          }))}
                        />
                      }
                      label="年齢不明"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="外見の特徴" size="small" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>サイズ（全長）</InputLabel>
                    <Select
                      value={formData.size}
                      onChange={(e) => handleInputChange('size')(e)}
                      label="サイズ（全長）"
                    >
                      {petSizes.map(size => (
                        <MenuItem key={size} value={size}>{size}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>鼻先から尾の付け根までの長さ</FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="体重"
                    type="number"
                    value={formData.weight}
                    onChange={handleInputChange('weight')}
                    placeholder="例: 5.5"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                    }}
                    helperText="おおよその体重を入力"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="毛色・模様"
                    value={formData.color}
                    onChange={handleInputChange('color')}
                    placeholder="例: 茶色と白のぶち"
                    helperText="特徴的な色や模様を記入"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="マイクロチップ番号"
                    value={formData.microchipNumber}
                    onChange={handleInputChange('microchipNumber')}
                    placeholder="15桁の番号"
                    helperText="装着している場合は入力"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="性格・特徴" size="small" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>性格（複数選択可）</InputLabel>
                    <Select
                      multiple
                      value={formData.personality}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personality: e.target.value as string[]
                      }))}
                      label="性格（複数選択可）"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {personalityOptions.map((personality) => (
                        <MenuItem key={personality} value={personality}>
                          <Checkbox checked={formData.personality.includes(personality)} />
                          {personality}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>ペットの性格を選択してください（行動予測に使用されます）</FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="首輪の情報" size="small" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasCollar}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hasCollar: e.target.checked,
                          collarColor: e.target.checked ? prev.collarColor : ''
                        }))}
                      />
                    }
                    label="首輪をつけている"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="首輪の色・特徴"
                    value={formData.collarColor}
                    onChange={handleInputChange('collarColor')}
                    disabled={!formData.hasCollar}
                    placeholder="例: 赤色の革製、鈴付き"
                    helperText="首輪の詳細を記入"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="その他の特徴"
                    value={formData.features}
                    onChange={handleInputChange('features')}
                    placeholder="傷跡、性格、好きな食べ物など"
                    helperText="見つけやすい特徴を詳しく記入してください"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
        
      case 1:
        return (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PhotoCameraIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h5" fontWeight="600">
                  ペットの写真
                </Typography>
              </Box>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                できるだけ多くの角度から撮影した写真をアップロードしてください。
                AI解析の精度が向上します。
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
                
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  最低2枚、最大10枚まで（JPG, PNG形式）
                </Typography>
                
                <input
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  id="image-upload"
                  multiple
                  type="file"
                  onChange={handleImageUpload}
                  disabled={images.length >= 10}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={images.length >= 10}
                    sx={{ mt: 2 }}
                  >
                    画像を選択（{images.length}/10）
                  </Button>
                </label>
              </Box>
              
              {imagePreviewUrls.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    アップロード済み画像
                  </Typography>
                  <Grid container spacing={2}>
                    {imagePreviewUrls.map((url, index) => (
                      <Grid item xs={6} sm={4} md={3} key={index}>
                        <Paper sx={{ 
                          position: 'relative',
                          paddingTop: '100%',
                          overflow: 'hidden',
                          borderRadius: 2
                        }}>
                          <Box
                            component="img"
                            src={url}
                            alt={`Pet ${index + 1}`}
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
                          <Chip
                            label={`写真 ${index + 1}`}
                            size="small"
                            sx={{
                              position: 'absolute',
                              bottom: 4,
                              left: 4,
                              bgcolor: 'rgba(255,255,255,0.9)'
                            }}
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        );
        
      case 2:
        return (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h5" fontWeight="600">
                  最後の目撃情報
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="最後に見た日付"
                    value={formData.lastSeenDate}
                    onChange={handleInputChange('lastSeenDate')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    required
                    helperText="いなくなった日付を選択"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="最後に見た時間"
                    value={formData.lastSeenTime}
                    onChange={handleInputChange('lastSeenTime')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccessTimeIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    error={fieldErrors.lastSeenTime}
                    required
                    helperText={fieldErrors.lastSeenTime ? '必須項目です' : 'いなくなった時間を選択（行動予測に使用されます）'}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="場所の詳細" size="small" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="最後に見た場所（住所）"
                    value={formData.lastSeenAddress}
                    onChange={handleInputChange('lastSeenAddress')}
                    error={fieldErrors.lastSeenAddress}
                    placeholder="例: 東京都渋谷区道玄坂1-2-3"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    required
                    helperText={fieldErrors.lastSeenAddress ? '必須項目です' : 'できるだけ詳しい住所を入力'}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="場所の詳細"
                    value={formData.lastSeenDetails}
                    onChange={handleInputChange('lastSeenDetails')}
                    placeholder="例: ○○公園の管理事務所の近く"
                    helperText="目印になる建物や特徴を記入"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="いなくなった状況" size="small" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>いなくなった理由</InputLabel>
                    <Select
                      value={formData.lostReason}
                      onChange={(e) => handleInputChange('lostReason')(e)}
                      label="いなくなった理由"
                    >
                      {lostReasons.map(reason => (
                        <MenuItem key={reason} value={reason}>{reason}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>該当するものを選択</FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="その他の情報"
                    value={formData.additionalInfo}
                    onChange={handleInputChange('additionalInfo')}
                    placeholder="いなくなった時の状況、ペットの習性など"
                    helperText="捜索に役立つ情報があれば記入してください"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
        
      case 3:
        return (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PetsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h5" fontWeight="600">
                  ニックネーム登録
                </Typography>
              </Box>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                チャットで発見者とやり取りする際に使用するニックネームを設定してください。
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ニックネーム"
                    value={formData.ownerNickname}
                    onChange={handleInputChange('ownerNickname')}
                    error={fieldErrors.ownerNickname}
                    required
                    placeholder="例: ポチの飼い主"
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
              </Grid>
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box sx={{ width: 240 }}>
        <Sidebar />
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <FormHeader 
          title="迷子ペット登録"
          subtitle="AIが24時間体制でペットを探します"
        />
        
        <Box sx={{ maxWidth: 1000, mx: 'auto', px: 4, py: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          

          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {activeStep === 4 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  登録完了
                </Typography>
                <Typography color="text.secondary">
                  AIエージェントが捜索を開始しました
                </Typography>
              </Box>
            ) : (
              <>
                {getStepContent(activeStep)}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    startIcon={<NavigateBeforeIcon />}
                  >
                    戻る
                  </Button>
                  
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b4199 100%)',
                        }
                      }}
                    >
                      {loading ? '登録中...' : '登録してAI捜索を開始'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      endIcon={<NavigateNextIcon />}
                    >
                      次へ
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Paper>
          
          {activeStep < steps.length && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">
                  すべての情報を入力すると、AIの捜索精度が向上します
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function UploadPetPage() {
  return (
    <ProtectedRoute>
      <UploadPetContent />
    </ProtectedRoute>
  );
}