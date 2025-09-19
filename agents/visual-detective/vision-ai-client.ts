import vision from '@google-cloud/vision';
import { VisualAnalysisResult } from '@/types/agents';

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

      // ペットタイプの判定
      const labels = result.labelAnnotations || [];
      const petType = this.detectPetType(labels);
      const breed = this.detectBreed(labels, petType);

      // 色情報の抽出
      const colors = this.extractColors(result.imagePropertiesAnnotation);

      // サイズの推定
      const size = this.estimateSize(result.localizedObjectAnnotations);

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
        description: this.generateDescription(petType, breed, colors, size),
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
    const dogScore = labels.find(l => l.description.toLowerCase().includes('dog'))?.score || 0;
    const catScore = labels.find(l => l.description.toLowerCase().includes('cat'))?.score || 0;
    
    if (dogScore > 0.7) return 'dog';
    if (catScore > 0.7) return 'cat';
    return 'other';
  }

  private detectBreed(labels: any[], petType: string): string | undefined {
    if (petType === 'dog') {
      const dogBreeds = ['labrador', 'golden retriever', 'bulldog', 'poodle', 'beagle'];
      for (const breed of dogBreeds) {
        const match = labels.find(l => l.description.toLowerCase().includes(breed));
        if (match) return match.description;
      }
    } else if (petType === 'cat') {
      const catBreeds = ['persian', 'siamese', 'maine coon', 'british shorthair'];
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
    // 簡略化されたカラー判定
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 50 && g < 50 && b < 50) return 'black';
    if (r > 150 && g < 100 && b < 100) return 'brown';
    if (r > 200 && g > 150 && b < 100) return 'golden';
    if (r < 100 && g < 100 && b < 100) return 'gray';
    return 'mixed';
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