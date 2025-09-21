import { PetInfo, FoundPetInfo } from '@/types/pet';
import { VisualAnalysisResult, PetMatchResult } from '@/types/agents';
import { VisionAIClient } from './vision-ai-client';
import { getBreedSimilarityScore } from '@/lib/config/dog-breeds';

export class PetMatcher {
  private visionClient: VisionAIClient;

  constructor() {
    this.visionClient = new VisionAIClient();
  }

  /**
   * 迷子ペットと発見ペットをマッチング
   */
  async matchPets(
    missingPet: PetInfo,
    foundPet: FoundPetInfo,
    missingPetAnalysis?: VisualAnalysisResult,
    foundPetAnalysis?: VisualAnalysisResult
  ): Promise<PetMatchResult> {
    console.log(`[PetMatcher] Starting match between missing pet "${missingPet.name}" and found pet`);
    console.log(`Missing pet: ${missingPet.type}, Found pet: ${foundPet.petType}`);
    
    // マイクロチップ番号が一致する場合は即座に100%マッチを返す
    const missingChip = (missingPet as any).microchipNumber || (missingPet as any).microchipId;
    const foundChip = foundPet.microchipNumber;
    
    if (missingChip && foundChip && missingChip === foundChip) {
      console.log(`[PetMatcher] Microchip match found! ${missingChip}`);
      return {
        missingPetId: missingPet.id || '',
        foundPetId: foundPet.id || '',
        matchScore: 100,
        visualSimilarity: 100,
        locationProximity: 100,
        timeDifference: this.calculateTimeDifference(missingPet, foundPet),
        matchDetails: {
          type: true,
          size: true,
          breed: true,
          microchip: true,
          color: missingPet.colors,
          features: ['マイクロチップ番号が完全一致']
        },
        analysisResult: this.getDefaultAnalysis(),
        confidence: 1.0,
        recommendedAction: 'high_match',
        createdAt: new Date()
      } as PetMatchResult;
    }
    
    // 時系列の矛盾チェック（発見日が迷子日より前の場合は即座に低スコア返却）
    const missingDate = new Date(missingPet.lastSeen.date);
    const foundDate = new Date(foundPet.foundDate);
    
    if (foundDate < missingDate) {
      console.log(`[PetMatcher] Timeline conflict detected: Found date (${foundPet.foundDate}) is before missing date (${missingPet.lastSeen.date})`);
      return {
        missingPetId: missingPet.id || '',
        foundPetId: foundPet.id || '',
        matchScore: 0,
        visualSimilarity: 0,
        locationProximity: 0,
        timeDifference: -1,
        matchDetails: {
          type: false,
          size: false,
          color: [],
          features: []
        },
        analysisResult: this.getDefaultAnalysis(),
        confidence: 0,
        recommendedAction: 'low_match',
        createdAt: new Date(),
        exclusionReason: 'timeline_conflict'
      } as PetMatchResult;
    }
    
    // 画像解析結果を取得（まだない場合）
    let missingAnalysis = missingPetAnalysis;
    let foundAnalysis = foundPetAnalysis;

    if (!missingAnalysis && missingPet.images.length > 0) {
      console.log(`[PetMatcher] Analyzing missing pet image: ${missingPet.images[0]}`);
      const imageBuffer = await this.fetchImageAsBuffer(missingPet.images[0]);
      missingAnalysis = await this.visionClient.analyzeImage(imageBuffer);
    }

    if (!foundAnalysis && foundPet.imageUrls.length > 0) {
      console.log(`[PetMatcher] Analyzing found pet image: ${foundPet.imageUrls[0]}`);
      const imageBuffer = await this.fetchImageAsBuffer(foundPet.imageUrls[0]);
      foundAnalysis = await this.visionClient.analyzeImage(imageBuffer);
    }

    // 追加の除外条件チェック
    const exclusionReason = this.checkExclusionConditions(missingPet, foundPet, missingAnalysis, foundAnalysis);
    if (exclusionReason) {
      console.log(`[PetMatcher] Exclusion condition met: ${exclusionReason}`);
      return {
        missingPetId: missingPet.id || '',
        foundPetId: foundPet.id || '',
        matchScore: 0,
        visualSimilarity: 0,
        locationProximity: 0,
        timeDifference: -1,
        matchDetails: {
          type: false,
          size: false,
          color: [],
          features: []
        },
        analysisResult: this.getDefaultAnalysis(),
        confidence: 0,
        recommendedAction: 'low_match',
        createdAt: new Date(),
        exclusionReason
      } as PetMatchResult;
    }
    
    // スコア計算
    const visualSimilarity = this.calculateVisualSimilarity(missingAnalysis, foundAnalysis);
    const typeMatch = this.matchPetType(missingPet, foundPet);
    const breedScore = this.calculateBreedScore(missingPet, foundPet);
    const sizeMatch = this.matchSize(missingPet, foundPet);
    const colorMatch = this.matchColors(missingPet, foundPet);
    const locationProximity = this.calculateLocationProximity(missingPet, foundPet);
    const timeDifference = this.calculateTimeDifference(missingPet, foundPet);

    console.log(`[PetMatcher] Scoring details:`);
    console.log(`  Visual similarity: ${visualSimilarity}%`);
    console.log(`  Type match: ${typeMatch}`);
    console.log(`  Breed similarity: ${Math.round(breedScore * 100)}%`);
    console.log(`  Size match: ${sizeMatch}`);
    console.log(`  Color matches: ${colorMatch.length > 0 ? colorMatch.join(', ') : 'none'}`);
    console.log(`  Location proximity: ${locationProximity}%`);
    console.log(`  Time difference: ${timeDifference} days`);

    // 総合スコアの計算（重み付け）- AIマッチング優先
    let weights;
    
    // Vision AI解析が成功している場合（信頼度が高い）
    if (missingAnalysis && foundAnalysis && 
        missingAnalysis.confidence > 0.5 && foundAnalysis.confidence > 0.5) {
      console.log('Using AI-heavy weighting (high confidence)');
      // 犬種が一致している場合は非常に高い重みを与える
      const breedWeight = breedScore >= 1.0 ? 30 : breedScore * 20;
      weights = {
        visualSimilarity: visualSimilarity * 0.35,  // 35% (AI優先)
        typeMatch: typeMatch ? 15 : 0,              // 15%
        breedMatch: breedWeight,                    // 20-30% (犬種マッチング)
        sizeMatch: sizeMatch ? 10 : 0,              // 10%
        colorMatch: colorMatch.length > 0 ? 8 : 0,  // 8%
        locationProximity: locationProximity * 0.02, // 2%
        timeDifference: Math.max(0, 10 - timeDifference * 0.1) // 最大10%
      };
    } else {
      console.log('Using balanced weighting (low AI confidence)');
      // 犬種が一致している場合は非常に高い重みを与える
      const breedWeight = breedScore >= 1.0 ? 35 : breedScore * 25;
      weights = {
        visualSimilarity: visualSimilarity * 0.15,  // 15% (低い信頼度)
        typeMatch: typeMatch ? 25 : 0,              // 25% (基本情報重視)
        breedMatch: breedWeight,                    // 25-35% (犬種マッチング)
        sizeMatch: sizeMatch ? 15 : 0,              // 15%
        colorMatch: colorMatch.length > 0 ? 10 : 0, // 10%
        locationProximity: locationProximity * 0.02, // 2%
        timeDifference: Math.max(0, 8 - timeDifference * 0.08) // 最大8%
      };
    }
    
    const matchScore = this.calculateOverallScore(weights);

    console.log(`[PetMatcher] Final match score: ${Math.round(matchScore)}%`);

    // 推奨アクションの決定
    const recommendedAction = this.getRecommendedAction(matchScore);

    return {
      missingPetId: missingPet.id || '',
      foundPetId: foundPet.id || '',
      matchScore: Math.round(matchScore),
      visualSimilarity: Math.round(visualSimilarity),
      locationProximity: Math.round(locationProximity),
      timeDifference,
      matchDetails: {
        type: typeMatch,
        size: sizeMatch,
        breed: breedScore >= 1.0, // 完全一致の場合のみtrue
        microchip: false, // マイクロチップ不一致（一致していたら既に上で返している）
        color: colorMatch,
        features: this.matchFeatures(missingPet, foundPet)
      },
      analysisResult: foundAnalysis || this.getDefaultAnalysis(),
      confidence: this.calculateConfidence(missingAnalysis, foundAnalysis),
      recommendedAction,
      createdAt: new Date()
    };
  }

  /**
   * 視覚的類似度の計算
   */
  private calculateVisualSimilarity(
    analysis1?: VisualAnalysisResult,
    analysis2?: VisualAnalysisResult
  ): number {
    if (!analysis1 || !analysis2) return 0;

    let totalScore = 0;
    let weights = {
      featureVector: 0.5,  // 50% - 特徴ベクトルの類似度（最重要）
      attributes: 0.3,     // 30% - 属性の一致
      colors: 0.2          // 20% - 色の一致
    };

    // 1. 特徴ベクトルのコサイン類似度を計算（0-1の範囲）
    if (analysis1.features && analysis2.features && 
        analysis1.features.length > 0 && analysis2.features.length > 0) {
      const cosineSimilarity = this.calculateCosineSimilarity(
        analysis1.features, 
        analysis2.features
      );
      totalScore += cosineSimilarity * weights.featureVector * 100;
      console.log(`[PetMatcher] Feature vector cosine similarity: ${(cosineSimilarity * 100).toFixed(2)}%`);
    } else {
      // 特徴ベクトルがない場合は、他の重みを調整
      weights.attributes = 0.6;
      weights.colors = 0.4;
      console.log('[PetMatcher] No feature vectors available, using attribute-based matching');
    }

    // 2. 属性ベースのスコア計算
    let attributeScore = 0;
    let attributeCount = 0;

    // ペットタイプの一致
    if (analysis1.petType === analysis2.petType) {
      attributeScore += 40;
      attributeCount++;
    }

    // 品種の一致
    if (analysis1.breed && analysis2.breed) {
      if (analysis1.breed.toLowerCase() === analysis2.breed.toLowerCase()) {
        attributeScore += 35;
      } else {
        // 部分一致も考慮
        const breed1Words = analysis1.breed.toLowerCase().split(/\s+/);
        const breed2Words = analysis2.breed.toLowerCase().split(/\s+/);
        const commonWords = breed1Words.filter(w => breed2Words.includes(w));
        if (commonWords.length > 0) {
          attributeScore += 15;
        }
      }
      attributeCount++;
    }

    // サイズの一致
    if (analysis1.size === analysis2.size) {
      attributeScore += 25;
      attributeCount++;
    }

    // 属性スコアを正規化
    if (attributeCount > 0) {
      attributeScore = attributeScore / Math.max(attributeCount, 1);
      totalScore += attributeScore * weights.attributes;
    }

    // 3. 色の類似度計算
    if (analysis1.color.length > 0 && analysis2.color.length > 0) {
      const commonColors = analysis1.color.filter(c1 => 
        analysis2.color.some(c2 => c1.toLowerCase() === c2.toLowerCase())
      );
      const colorSimilarity = (commonColors.length * 2) / 
        (analysis1.color.length + analysis2.color.length);
      totalScore += colorSimilarity * weights.colors * 100;
      console.log(`[PetMatcher] Color similarity: ${(colorSimilarity * 100).toFixed(2)}%`);
    }

    // 信頼度による調整
    const avgConfidence = (analysis1.confidence + analysis2.confidence) / 2;
    if (avgConfidence < 0.3) {
      // 低信頼度の場合はスコアを下げる
      totalScore *= 0.7;
      console.log(`[PetMatcher] Low confidence adjustment applied: ${(avgConfidence * 100).toFixed(2)}%`);
    }

    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * コサイン類似度の計算
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) {
      console.warn('[PetMatcher] Feature vectors have different lengths or are empty');
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    // コサイン類似度は-1から1の範囲なので、0から1に正規化
    const cosineSim = dotProduct / (norm1 * norm2);
    return (cosineSim + 1) / 2;
  }

  /**
   * ペットタイプのマッチング
   */
  private matchPetType(missingPet: PetInfo, foundPet: FoundPetInfo): boolean {
    return missingPet.type.toLowerCase() === foundPet.petType.toLowerCase();
  }

  /**
   * 犬種の類似度スコア計算
   */
  private calculateBreedScore(missingPet: PetInfo, foundPet: FoundPetInfo): number {
    // 両方とも犬でない場合はスコアを返さない
    if (missingPet.type !== '犬' || foundPet.petType !== '犬') {
      return 0;
    }
    
    // breed情報を取得（PetInfoとFoundPetInfoの型定義が異なる可能性があるため、安全に取得）
    const missingBreed = (missingPet as any).breed || (missingPet as any).petBreed;
    const foundBreed = (foundPet as any).breed || (foundPet as any).petBreed;
    
    // 犬種情報がない場合
    if (!missingBreed && !foundBreed) {
      return 0.3; // 両方とも不明の場合は低めのスコア
    }
    
    // 片方だけ犬種情報がある場合
    if (!missingBreed || !foundBreed) {
      return 0.2; // 情報不足のため低スコア
    }
    
    // 犬種類似度スコアを計算
    const score = getBreedSimilarityScore(missingBreed, foundBreed);
    console.log(`[PetMatcher] Breed matching: ${missingBreed} vs ${foundBreed} = ${score}`);
    
    return score;
  }

  /**
   * サイズのマッチング
   */
  private matchSize(missingPet: PetInfo, foundPet: FoundPetInfo): boolean {
    return missingPet.size.toLowerCase() === foundPet.size.toLowerCase();
  }

  /**
   * 色のマッチング
   */
  private matchColors(missingPet: PetInfo, foundPet: FoundPetInfo): string[] {
    if (!foundPet.color || !missingPet.colors || missingPet.colors.length === 0) {
      return [];
    }
    
    const foundColors = foundPet.color.toLowerCase().split(/[,、\s]+/).filter(c => c.trim() !== '');
    return missingPet.colors
      .filter(color => color && color.trim() !== '')
      .filter(color => 
        foundColors.some(fc => fc.includes(color.toLowerCase()) || 
                              color.toLowerCase().includes(fc))
      );
  }

  /**
   * 特徴のマッチング
   */
  private matchFeatures(missingPet: PetInfo, foundPet: FoundPetInfo): string[] {
    if (!missingPet.specialFeatures || !foundPet.features) {
      return [];
    }
    
    const missingFeatures = missingPet.specialFeatures.toLowerCase()
      .split(/[,、。\s]+/)
      .filter(f => f.trim() !== '');
    const foundFeatures = foundPet.features.toLowerCase()
      .split(/[,、。\s]+/)
      .filter(f => f.trim() !== '');
    
    if (missingFeatures.length === 0 || foundFeatures.length === 0) {
      return [];
    }
    
    return missingFeatures
      .filter(mf => mf && mf.length > 0)
      .filter(mf => 
        foundFeatures.some(ff => ff && ff.length > 0 && (ff.includes(mf) || mf.includes(ff)))
      );
  }

  /**
   * 場所の近さを計算（簡易版）
   */
  private calculateLocationProximity(
    missingPet: PetInfo,
    foundPet: FoundPetInfo
  ): number {
    // 実際にはGoogle Maps APIで距離計算すべきですが、ここでは簡易的に住所の類似度で判定
    const missingLocation = missingPet.lastSeen.location.toLowerCase();
    const foundLocation = foundPet.foundAddress.toLowerCase();

    // 同じ単語がどれだけ含まれているか
    const missingWords = missingLocation.split(/[\s,、]+/);
    const foundWords = foundLocation.split(/[\s,、]+/);
    const commonWords = missingWords.filter(w => foundWords.includes(w));

    const similarity = commonWords.length / Math.max(missingWords.length, foundWords.length);
    return similarity * 100;
  }

  /**
   * 時間差を計算（日数）
   * 生存率を考慮したスコアリング
   */
  private calculateTimeDifference(
    missingPet: PetInfo,
    foundPet: FoundPetInfo
  ): number {
    const missingDate = new Date(missingPet.lastSeen.date);
    const foundDate = new Date(foundPet.foundDate);
    const diffTime = foundDate.getTime() - missingDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 負の値は時系列矛盾（すでにチェック済みだが念のため）
    if (diffDays < 0) return -1;
    
    // 生存率曲線に基づくペナルティ
    // 1週間以内: ペナルティ小
    // 2週間: 中程度のペナルティ
    // 1ヶ月以上: 大きなペナルティ
    let survivalPenalty = 0;
    if (diffDays <= 7) {
      survivalPenalty = diffDays * 2; // 0-14点
    } else if (diffDays <= 14) {
      survivalPenalty = 14 + (diffDays - 7) * 3; // 14-35点
    } else if (diffDays <= 30) {
      survivalPenalty = 35 + (diffDays - 14) * 2; // 35-67点
    } else {
      survivalPenalty = 67 + Math.min(diffDays - 30, 33); // 最大100点
    }
    
    return survivalPenalty;
  }

  /**
   * 総合スコアの計算
   */
  private calculateOverallScore(scores: Record<string, number>): number {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  }

  /**
   * 推奨アクションの決定
   */
  private getRecommendedAction(
    matchScore: number
  ): 'high_match' | 'possible_match' | 'low_match' {
    if (matchScore >= 75) return 'high_match';
    if (matchScore >= 50) return 'possible_match';
    return 'low_match';
  }

  /**
   * 信頼度の計算
   */
  private calculateConfidence(
    analysis1?: VisualAnalysisResult,
    analysis2?: VisualAnalysisResult
  ): number {
    if (!analysis1 || !analysis2) return 0.5;
    return (analysis1.confidence + analysis2.confidence) / 2;
  }

  /**
   * 画像URLからBufferを取得
   */
  private async fetchImageAsBuffer(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Failed to fetch image:', error);
      return Buffer.from('');
    }
  }

  /**
   * 除外条件のチェック
   * あり得ないマッチングを事前に除外
   */
  private checkExclusionConditions(
    missingPet: PetInfo,
    foundPet: FoundPetInfo,
    missingAnalysis?: VisualAnalysisResult,
    foundAnalysis?: VisualAnalysisResult
  ): string | null {
    // 1. 種類の完全不一致（犬と猫など）
    const missingType = missingPet.type.toLowerCase();
    const foundType = foundPet.petType.toLowerCase();
    
    // 明確に異なる種類の場合
    if ((missingType === '犬' || missingType === 'dog') && 
        (foundType === '猫' || foundType === 'cat')) {
      return 'species_mismatch';
    }
    if ((missingType === '猫' || missingType === 'cat') && 
        (foundType === '犬' || foundType === 'dog')) {
      return 'species_mismatch';
    }
    
    // 2. サイズの極端な不一致
    // 小型が大型になることはない（成長を考慮しても）
    const missingSize = missingPet.size.toLowerCase();
    const foundSize = foundPet.size.toLowerCase();
    const daysDiff = this.calculateTimeDifference(missingPet, foundPet);
    
    // 30日以内の変化で極端なサイズ差は不可能
    if (daysDiff <= 30) {
      if ((missingSize === '小型' || missingSize === 'small') && 
          (foundSize === '大型' || foundSize === 'large')) {
        return 'impossible_size_change';
      }
      if ((missingSize === '大型' || missingSize === 'large') && 
          (foundSize === '小型' || foundSize === 'small')) {
        return 'impossible_size_change';
      }
    }
    
    // 3. AI解析による明確な種別不一致
    if (missingAnalysis && foundAnalysis) {
      // 高信頼度で種類が完全に異なる場合
      if (missingAnalysis.confidence > 0.8 && foundAnalysis.confidence > 0.8) {
        if (missingAnalysis.petType !== foundAnalysis.petType) {
          // 犬と猫の区別は確実
          if ((missingAnalysis.petType === 'dog' && foundAnalysis.petType === 'cat') ||
              (missingAnalysis.petType === 'cat' && foundAnalysis.petType === 'dog')) {
            return 'ai_species_mismatch';
          }
        }
        
        // 品種が明確に異なる場合（高信頼度時）
        if (missingAnalysis.breed && foundAnalysis.breed) {
          const breed1 = missingAnalysis.breed.toLowerCase();
          const breed2 = foundAnalysis.breed.toLowerCase();
          
          // 明らかに異なる品種グループ
          const isLargeDogBreed = (breed: string) => 
            breed.includes('retriever') || breed.includes('shepherd') || 
            breed.includes('husky') || breed.includes('labrador');
          const isSmallDogBreed = (breed: string) => 
            breed.includes('chihuahua') || breed.includes('pomeranian') || 
            breed.includes('yorkshire') || breed.includes('maltese');
          
          if (isLargeDogBreed(breed1) && isSmallDogBreed(breed2)) {
            return 'incompatible_breeds';
          }
          if (isSmallDogBreed(breed1) && isLargeDogBreed(breed2)) {
            return 'incompatible_breeds';
          }
        }
      }
    }
    
    // 4. 距離と時間の物理的不可能性
    // 1日で100km以上離れた場所での発見は非現実的
    if (daysDiff <= 1) {
      const proximity = this.calculateLocationProximity(missingPet, foundPet);
      if (proximity < 10) { // 非常に低い類似度 = 遠い場所
        return 'impossible_distance';
      }
    }
    
    return null; // 除外条件なし
  }
  
  /**
   * デフォルトの解析結果
   */
  private getDefaultAnalysis(): VisualAnalysisResult {
    return {
      petType: 'other',
      color: [],
      size: 'medium',
      confidence: 0,
      features: [],
      imageQuality: 0,
      description: 'No analysis available'
    };
  }
}