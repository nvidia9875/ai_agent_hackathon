import { geminiModel } from '@/lib/config/gemini';

export interface PetFeatures {
  species: string;
  breed?: string;
  color?: string;
  size?: string;
  age?: string;
  distinguishingMarks?: string;
  temperament?: string;
  otherFeatures?: string;
}

export interface MatchingResult {
  overallScore: number;
  details: {
    category: string;
    similarity: number;
    explanation: string;
  }[];
  summary: string;
}

export class PetFeatureAnalyzer {
  async analyzeSimilarity(
    lostPetFeatures: PetFeatures,
    foundPetFeatures: PetFeatures
  ): Promise<MatchingResult> {
    const prompt = this.buildPrompt(lostPetFeatures, foundPetFeatures);
    
    try {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseResponse(text);
    } catch (error) {
      console.error('Error analyzing pet features:', error);
      throw new Error('Failed to analyze pet features');
    }
  }

  private buildPrompt(lostPet: PetFeatures, foundPet: PetFeatures): string {
    return `
あなたは迷子のペットと発見されたペットの特徴を比較する専門家です。
以下の2つのペットの特徴を詳細に分析し、一致度を評価してください。

迷子のペット:
- 種類: ${lostPet.species || '不明'}
- 品種: ${lostPet.breed || '不明'}
- 色: ${lostPet.color || '不明'}
- サイズ: ${lostPet.size || '不明'}
- 年齢: ${lostPet.age || '不明'}
- 特徴的なマーク: ${lostPet.distinguishingMarks || 'なし'}
- 性格: ${lostPet.temperament || '不明'}
- その他の特徴: ${lostPet.otherFeatures || 'なし'}

発見されたペット:
- 種類: ${foundPet.species || '不明'}
- 品種: ${foundPet.breed || '不明'}
- 色: ${foundPet.color || '不明'}
- サイズ: ${foundPet.size || '不明'}
- 年齢: ${foundPet.age || '不明'}
- 特徴的なマーク: ${foundPet.distinguishingMarks || 'なし'}
- 性格: ${foundPet.temperament || '不明'}
- その他の特徴: ${foundPet.otherFeatures || 'なし'}

以下の形式でJSON形式で回答してください:
{
  "overallScore": [0-100の総合的な一致度スコア],
  "details": [
    {
      "category": "種類",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "品種",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "色",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "サイズ",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "年齢",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "特徴的なマーク",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "性格",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    },
    {
      "category": "その他の特徴",
      "similarity": [0-100のカテゴリ別一致度],
      "explanation": "一致/不一致の理由"
    }
  ],
  "summary": "総合的な評価のサマリー（100文字程度）"
}

重要な点:
- 種類が異なる場合は、総合スコアは非常に低くなるべきです
- 特徴的なマークは重要な判断材料です
- 不明な項目はスコア計算から除外してください
- フリーテキストの「その他の特徴」は文脈を理解して比較してください`;
  }

  private parseResponse(text: string): MatchingResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 0)),
        details: parsed.details || [],
        summary: parsed.summary || '',
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        overallScore: 0,
        details: [],
        summary: 'AIによる分析に失敗しました',
      };
    }
  }

  calculateQuickScore(lostPet: PetFeatures, foundPet: PetFeatures): number {
    let score = 0;
    let factors = 0;

    if (lostPet.species === foundPet.species) {
      score += 30;
      factors++;
    }

    if (lostPet.breed && foundPet.breed && lostPet.breed === foundPet.breed) {
      score += 20;
      factors++;
    }

    if (lostPet.color && foundPet.color && lostPet.color === foundPet.color) {
      score += 20;
      factors++;
    }

    if (lostPet.size && foundPet.size && lostPet.size === foundPet.size) {
      score += 15;
      factors++;
    }

    if (lostPet.age && foundPet.age) {
      const ageDiff = Math.abs(parseInt(lostPet.age) - parseInt(foundPet.age));
      if (!isNaN(ageDiff)) {
        score += Math.max(0, 15 - ageDiff * 5);
        factors++;
      }
    }

    return factors > 0 ? Math.round(score) : 0;
  }
}

export const petFeatureAnalyzer = new PetFeatureAnalyzer();