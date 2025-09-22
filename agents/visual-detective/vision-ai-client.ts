import vision from '@google-cloud/vision';
import { VisualAnalysisResult } from '@/types/agents';
import { geminiModel } from '@/lib/config/gemini';

export class VisionAIClient {
  private client: vision.ImageAnnotatorClient;

  constructor() {
    try {
      this.client = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        timeout: 30000, // 30秒タイムアウト
      });
      console.log('Vision AI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Vision AI client:', error);
      throw error;
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<VisualAnalysisResult> {
    try {
      console.log('Starting Vision AI analysis...');
      
      // Vision AI APIで画像解析（タイムアウト付き）
      const analysisPromise = this.client.annotateImage({
        image: {
          content: imageBuffer.toString('base64'),
        },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'IMAGE_PROPERTIES', maxResults: 5 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
        ],
      });

      // 20秒でタイムアウト
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vision AI timeout')), 20000);
      });

      const [result] = await Promise.race([analysisPromise, timeoutPromise]) as any;
      console.log('Vision AI analysis completed successfully');

      // Gemini APIを使用して画像から詳細な色と特徴を抽出
      const geminiAnalysis = await this.analyzeWithGemini(imageBuffer);
      console.log('Gemini analysis result:', geminiAnalysis);

      // ペットタイプの判定（Vision APIとGeminiの結果を統合）
      const labels = result.labelAnnotations || [];
      const petType = geminiAnalysis.petType || this.detectPetType(labels);
      const breed = geminiAnalysis.breed || this.detectBreed(labels, petType);

      // 色情報の抽出（Geminiの結果を優先）
      const visionColors = this.extractColors(result.imagePropertiesAnnotation);
      const colors = geminiAnalysis.colors?.length > 0 ? geminiAnalysis.colors : visionColors;

      // サイズの推定
      const size = geminiAnalysis.size || this.estimateSize(result.localizedObjectAnnotations);

      // 画像品質の評価
      const imageQuality = this.assessImageQuality(result);

      // 特徴ベクトル生成（仮実装）
      const features = await this.generateFeatureVector(imageBuffer);

      return {
        petType,
        breed,
        color: colors,
        size,
        confidence: this.calculateConfidence(result),
        features,
        imageQuality,
        description: geminiAnalysis.description || this.generateDescription(petType, breed, colors, size),
        physicalFeatures: geminiAnalysis.physicalFeatures, // 外見の特徴
        distinguishingMarks: geminiAnalysis.distinguishingMarks, // 識別可能な特徴
      };
    } catch (error) {
      console.error('Vision AI analysis error:', error);
      
      // フォールバック：基本的な解析結果を返す
      console.log('Using fallback analysis...');
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(): VisualAnalysisResult {
    console.log('Using fallback analysis due to Vision API failure');
    return {
      petType: 'other', // 不明として処理
      breed: undefined,
      color: ['unknown'],
      size: 'medium',
      confidence: 0.1, // 非常に低い信頼度
      features: new Array(1024).fill(0.001), // ダミー特徴量
      imageQuality: 0,
      description: 'Vision API unavailable - fallback analysis',
    };
  }

  private detectPetType(labels: any[]): 'dog' | 'cat' | 'other' {
    // 英語と日本語の両方をチェック
    const dogKeywords = ['dog', 'puppy', 'canine', '犬', 'イヌ', 'ワンちゃん', 'わんこ'];
    const catKeywords = ['cat', 'kitten', 'feline', '猫', 'ネコ', 'にゃんこ'];
    
    let dogScore = 0;
    let catScore = 0;
    
    labels.forEach(label => {
      const desc = label.description.toLowerCase();
      if (dogKeywords.some(keyword => desc.includes(keyword))) {
        dogScore = Math.max(dogScore, label.score);
      }
      if (catKeywords.some(keyword => desc.includes(keyword))) {
        catScore = Math.max(catScore, label.score);
      }
    });
    
    if (dogScore > 0.7) return 'dog';
    if (catScore > 0.7) return 'cat';
    return 'other';
  }

  private detectBreed(labels: any[], petType: string): string | undefined {
    if (petType === 'dog') {
      const dogBreeds = [
        // 英語
        'labrador', 'golden retriever', 'bulldog', 'poodle', 'beagle', 'chihuahua', 'dachshund',
        'shiba inu', 'akita', 'pomeranian', 'corgi', 'terrier',
        // 日本語
        '柴犬', '秋田犬', 'トイプードル', 'チワワ', 'ポメラニアン', 'コーギー',
        'ラブラドール', 'ゴールデンレトリーバー', 'ビーグル', 'ダックスフンド'
      ];
      for (const breed of dogBreeds) {
        const match = labels.find(l => l.description.toLowerCase().includes(breed));
        if (match) return match.description;
      }
    } else if (petType === 'cat') {
      const catBreeds = [
        // 英語
        'persian', 'siamese', 'maine coon', 'british shorthair', 'scottish fold', 'ragdoll',
        // 日本語  
        'ペルシャ', 'シャム', 'メインクーン', 'スコティッシュフォールド', 'ラグドール',
        'アメリカンショートヘア', 'ロシアンブルー'
      ];
      for (const breed of catBreeds) {
        const match = labels.find(l => l.description.toLowerCase().includes(breed));
        if (match) return match.description;
      }
    }
    return undefined;
  }

  private extractColors(imageProperties: any): string[] {
    if (!imageProperties?.dominantColors?.colors) return [];
    
    return imageProperties.dominantColors.colors
      .slice(0, 3)
      .map((color: any) => {
        const r = color.color.red || 0;
        const g = color.color.green || 0;
        const b = color.color.blue || 0;
        return this.rgbToColorName(r, g, b);
      });
  }

  private rgbToColorName(r: number, g: number, b: number): string {
    // 日本語の色名を返す
    if (r > 200 && g > 200 && b > 200) return '白';
    if (r < 50 && g < 50 && b < 50) return '黒';
    if (r > 150 && g < 100 && b < 100) return '茶色';
    if (r > 200 && g > 150 && b < 100) return '金色';
    if (r < 100 && g < 100 && b < 100) return '灰色';
    if (r > 200 && g > 200 && b < 150) return 'クリーム';
    if (r > 180 && g > 120 && b < 100) return 'ベージュ';
    return '混合色';
  }

  private estimateSize(objects: any[]): 'small' | 'medium' | 'large' {
    if (!objects || objects.length === 0) return 'medium';
    
    const petObject = objects.find(o => 
      o.name.toLowerCase().includes('dog') || 
      o.name.toLowerCase().includes('cat')
    );
    
    if (!petObject) return 'medium';
    
    const bbox = petObject.boundingPoly?.normalizedVertices;
    if (!bbox || bbox.length < 4) return 'medium';
    
    const width = Math.abs(bbox[1].x - bbox[0].x);
    const height = Math.abs(bbox[2].y - bbox[0].y);
    const area = width * height;
    
    if (area < 0.2) return 'small';
    if (area > 0.5) return 'large';
    return 'medium';
  }

  private assessImageQuality(result: any): number {
    // 画像品質スコア（0-100）
    let score = 50;
    
    // ラベル検出の信頼度
    if (result.labelAnnotations && result.labelAnnotations.length > 0) {
      const avgConfidence = result.labelAnnotations
        .slice(0, 5)
        .reduce((sum: number, l: any) => sum + l.score, 0) / 5;
      score += avgConfidence * 30;
    }
    
    // オブジェクト検出の品質
    if (result.localizedObjectAnnotations && result.localizedObjectAnnotations.length > 0) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  private async generateFeatureVector(imageBuffer: Buffer): Promise<number[]> {
    // 画像のハッシュベースの疑似特徴ベクトル生成
    // 実際のプロダクションではVertex AIのEmbedding APIやカスタムモデルを使用すべき
    
    const crypto = require('crypto');
    
    // 画像データからハッシュを生成
    const hash = crypto.createHash('sha256').update(imageBuffer).digest();
    
    // ハッシュから決定論的な特徴ベクトルを生成（128次元）
    const features: number[] = [];
    const dimension = 128; // 次元数を減らして計算を高速化
    
    for (let i = 0; i < dimension; i++) {
      // ハッシュの各バイトから特徴値を生成
      const byteIndex = i % hash.length;
      const byte = hash[byteIndex];
      
      // 複数のバイトを組み合わせて変動を作る
      const nextByte = hash[(byteIndex + 1) % hash.length];
      const prevByte = hash[(byteIndex - 1 + hash.length) % hash.length];
      
      // -1 から 1 の範囲の値を生成
      const value = ((byte + nextByte * 0.5 + prevByte * 0.3) % 256) / 128 - 1;
      
      // ノイズを少し加えて完全一致を避ける（同じ画像でも若干の違いを持たせる）
      const noise = (Math.sin(i * byte) * 0.05); // ±0.05の範囲のノイズ
      features.push(value + noise);
    }
    
    // L2正規化
    const norm = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return features.map(val => val / norm);
    }
    
    // ノルムが0の場合のフォールバック
    return features.map(() => 0.01);
  }

  private calculateConfidence(result: any): number {
    const hasLabels = result.labelAnnotations && result.labelAnnotations.length > 0;
    const hasObjects = result.localizedObjectAnnotations && result.localizedObjectAnnotations.length > 0;
    const hasColors = result.imagePropertiesAnnotation?.dominantColors?.colors?.length > 0;
    
    let confidence = 0;
    if (hasLabels) confidence += 0.4;
    if (hasObjects) confidence += 0.4;
    if (hasColors) confidence += 0.2;
    
    return confidence;
  }

  /**
   * Gemini APIを使用して画像から詳細な情報を抽出
   */
  private async analyzeWithGemini(imageBuffer: Buffer): Promise<any> {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
この画像に写っているペットを詳しく分析してください。以下の情報をJSON形式で返してください：

{
  "petType": "犬、猫、その他から選択",
  "breed": "犬種または猫種（わかる場合）",
  "colors": ["主要な毛色のリスト（例：茶色、白、黒など）"],
  "colorPattern": "色のパターン（例：単色、二色、三毛、ぶち、縞模様など）",
  "size": "小型、中型、大型から選択",
  "physicalFeatures": "外見の特徴（耳の形、尾の長さ、体型など）",
  "distinguishingMarks": "識別可能な特徴（模様、傷跡、特徴的な部位など）",
  "estimatedAge": "推定年齢（子犬/子猫、若い、成犬/成猫、老犬/老猫）",
  "description": "ペットの詳細な説明（30文字以内）"
}

注意事項：
- 毛色は日本語で記述してください（茶色、白、黒、グレー、クリーム色など）
- 複数の色がある場合は全て列挙してください
- 特徴的な模様や配色パターンがあれば詳しく記述してください
- 不明な項目は"不明"と記述してください`;

      const result = await geminiModel.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        },
        { text: prompt }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // JSONを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        
        // petTypeを英語に変換
        if (analysisResult.petType === '犬') analysisResult.petType = 'dog';
        else if (analysisResult.petType === '猫') analysisResult.petType = 'cat';
        else analysisResult.petType = 'other';
        
        // sizeを英語に変換
        if (analysisResult.size === '小型') analysisResult.size = 'small';
        else if (analysisResult.size === '中型') analysisResult.size = 'medium';
        else if (analysisResult.size === '大型') analysisResult.size = 'large';
        
        console.log('Gemini extracted features:', analysisResult);
        return analysisResult;
      }
      
      return {};
    } catch (error) {
      console.error('Gemini analysis error:', error);
      return {};
    }
  }

  private generateDescription(
    petType: string,
    breed: string | undefined,
    colors: string[],
    size: string
  ): string {
    const breedStr = breed ? `${breed} ` : '';
    const colorStr = colors.length > 0 ? colors.join('/') : 'unknown color';
    return `${size} ${colorStr} ${breedStr}${petType}`;
  }
}