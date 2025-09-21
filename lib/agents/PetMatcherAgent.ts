import { BaseAgent } from './base-agent';
import { petFeatureAnalyzer, type PetFeatures, type MatchingResult } from '@/lib/services/pet-feature-analyzer';

interface PetMatchRequest {
  lostPet: PetFeatures;
  foundPets: Array<PetFeatures & { id: string; location?: string }>;
}

interface PetMatchResponse {
  matches: Array<{
    id: string;
    location?: string;
    features: PetFeatures;
    matchingResult: MatchingResult;
  }>;
  bestMatchId?: string;
  analysisComplete: boolean;
}

export class PetMatcherAgent extends BaseAgent {
  constructor() {
    super('pet-matcher', 'ペットマッチング分析エージェント');
  }

  async processRequest(request: PetMatchRequest): Promise<PetMatchResponse> {
    try {
      this.updateStatus('active', 'ペットの特徴を分析中...');
      
      const matches = await Promise.all(
        request.foundPets.map(async (foundPet) => {
          try {
            const matchingResult = await petFeatureAnalyzer.analyzeSimilarity(
              request.lostPet,
              foundPet
            );
            
            return {
              id: foundPet.id,
              location: foundPet.location,
              features: foundPet,
              matchingResult,
            };
          } catch (error) {
            console.error(`Error analyzing pet ${foundPet.id}:`, error);
            
            const quickScore = petFeatureAnalyzer.calculateQuickScore(
              request.lostPet,
              foundPet
            );
            
            return {
              id: foundPet.id,
              location: foundPet.location,
              features: foundPet,
              matchingResult: {
                overallScore: quickScore,
                details: [],
                summary: 'AI分析に失敗したため簡易スコアを表示しています',
              },
            };
          }
        })
      );

      matches.sort((a, b) => b.matchingResult.overallScore - a.matchingResult.overallScore);
      
      const bestMatch = matches[0];
      const bestMatchId = bestMatch && bestMatch.matchingResult.overallScore >= 60 
        ? bestMatch.id 
        : undefined;
      
      this.updateStatus('idle', '分析完了');
      
      return {
        matches,
        bestMatchId,
        analysisComplete: true,
      };
    } catch (error) {
      console.error('PetMatcherAgent error:', error);
      this.updateStatus('error', 'マッチング分析中にエラーが発生しました');
      throw error;
    }
  }

  async analyzeSingleMatch(
    lostPet: PetFeatures, 
    foundPet: PetFeatures
  ): Promise<MatchingResult> {
    try {
      this.updateStatus('active', '1対1でペットの特徴を詳細分析中...');
      
      const result = await petFeatureAnalyzer.analyzeSimilarity(lostPet, foundPet);
      
      this.updateStatus('idle', '詳細分析完了');
      
      return result;
    } catch (error) {
      console.error('Single match analysis error:', error);
      this.updateStatus('error', '詳細分析中にエラーが発生しました');
      
      const quickScore = petFeatureAnalyzer.calculateQuickScore(lostPet, foundPet);
      return {
        overallScore: quickScore,
        details: [],
        summary: 'AI分析に失敗したため簡易スコアを表示しています',
      };
    }
  }

  async batchAnalyze(
    lostPets: Array<PetFeatures & { id: string }>,
    foundPets: Array<PetFeatures & { id: string }>
  ): Promise<Array<{
    lostPetId: string;
    foundPetId: string;
    matchingResult: MatchingResult;
  }>> {
    const results = [];
    let processed = 0;
    const total = lostPets.length * foundPets.length;
    
    for (const lostPet of lostPets) {
      for (const foundPet of foundPets) {
        try {
          this.updateStatus('active', `分析中... (${processed + 1}/${total})`);
          
          const matchingResult = await petFeatureAnalyzer.analyzeSimilarity(
            lostPet,
            foundPet
          );
          
          results.push({
            lostPetId: lostPet.id,
            foundPetId: foundPet.id,
            matchingResult,
          });
          
          processed++;
        } catch (error) {
          console.error(`Batch analysis error for ${lostPet.id} - ${foundPet.id}:`, error);
        }
      }
    }
    
    this.updateStatus('idle', 'バッチ分析完了');
    return results;
  }

  getRecommendations(matchingResult: MatchingResult): string[] {
    const recommendations: string[] = [];
    
    if (matchingResult.overallScore >= 80) {
      recommendations.push('高い一致度です。写真での確認をお勧めします。');
      recommendations.push('飼い主様への連絡を検討してください。');
    } else if (matchingResult.overallScore >= 60) {
      recommendations.push('中程度の一致度です。追加情報の収集をお勧めします。');
      recommendations.push('特徴的なマークや行動パターンを再確認してください。');
    } else if (matchingResult.overallScore >= 40) {
      recommendations.push('低い一致度です。他の候補も確認することをお勧めします。');
    } else {
      recommendations.push('一致度が低いため、別のペットの可能性が高いです。');
    }
    
    const lowScoreCategories = matchingResult.details
      .filter(d => d.similarity < 50)
      .map(d => d.category);
    
    if (lowScoreCategories.length > 0) {
      recommendations.push(
        `特に「${lowScoreCategories.join('、')}」の項目で相違があります。`
      );
    }
    
    return recommendations;
  }
}

export const petMatcherAgent = new PetMatcherAgent();