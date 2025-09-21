import { NextRequest, NextResponse } from 'next/server';
import { VisualDetectiveAgent } from '@/agents/visual-detective';
import { getAdminFirestore, removeUndefinedFields } from '@/lib/firebase-admin/config';
import { PetInfo, FoundPetInfo } from '@/types/pet';
import { geminiModel } from '@/lib/config/gemini';

// エージェントのシングルトンインスタンス
let visualDetectiveAgent: VisualDetectiveAgent | null = null;

function getAgent() {
  if (!visualDetectiveAgent) {
    visualDetectiveAgent = new VisualDetectiveAgent();
  }
  return visualDetectiveAgent;
}

// ベーシックマッチング関数（画像解析なし）
function calculateBasicMatch(missingPet: PetInfo, foundPet: FoundPetInfo): number {
  let score = 0;
  
  // タイプマッチ
  if (missingPet.type?.toLowerCase() === foundPet.petType?.toLowerCase()) {
    score += 30;
  }
  
  // サイズマッチ
  if (missingPet.size === foundPet.size) {
    score += 20;
  }
  
  // 色マッチ
  if (missingPet.colors?.[0] && foundPet.color && 
      missingPet.colors[0].toLowerCase().includes(foundPet.color.toLowerCase())) {
    score += 15;
  }
  
  // 場所の近さ（簡易）
  if (missingPet.lastSeen?.location && foundPet.foundAddress) {
    const missingWords = missingPet.lastSeen.location.toLowerCase().split(/[\s,、]+/);
    const foundWords = foundPet.foundAddress.toLowerCase().split(/[\s,、]+/);
    const commonWords = missingWords.filter(w => foundWords.includes(w) && w.length > 1);
    if (commonWords.length > 0) {
      score += 10;
    }
  }
  
  return score;
}

// 場所の近さを計算（犬の歩ける距離を考慮）
function calculateLocationProximity(missingPet: PetInfo, foundPet: FoundPetInfo): number {
  const missingLocation = (missingPet.lastSeen?.location || '').toLowerCase();
  const foundLocation = (foundPet.foundAddress || '').toLowerCase();

  if (!missingLocation || !foundLocation) {
    console.log('Location data missing for proximity calculation');
    return 0;
  }

  console.log(`Calculating proximity: "${missingLocation}" vs "${foundLocation}"`);

  // 完全一致の場合
  if (missingLocation === foundLocation) {
    console.log('Exact location match');
    return 100;
  }

  // 地域レベルでの一致度を計算
  const missingWords = missingLocation.split(/[\s,、]+/).filter(w => w.length > 1);
  const foundWords = foundLocation.split(/[\s,、]+/).filter(w => w.length > 1);
  const commonWords = missingWords.filter(w => foundWords.includes(w));

  // 犬の迷子行動パターンに基づく距離評価
  let proximityScore = 0;
  
  // 都道府県レベルの一致
  const prefectures = ['東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '京都府', '兵庫県', '愛知県'];
  const missingPref = prefectures.find(p => missingLocation.includes(p.replace(/[都府県]/g, '')));
  const foundPref = prefectures.find(p => foundLocation.includes(p.replace(/[都府県]/g, '')));
  
  if (missingPref && foundPref && missingPref === foundPref) {
    proximityScore += 30; // 同一都道府県
    console.log(`Same prefecture: ${missingPref}`);
    
    // 市区町村レベルの一致
    if (commonWords.length >= 2) {
      proximityScore += 40; // 同一市区町村
      console.log('Same city/ward level');
      
      // 詳細地域の一致（町名・駅名など）
      if (commonWords.length >= 3) {
        proximityScore += 30; // 同一詳細地域
        console.log('Same detailed area');
      }
    } else if (commonWords.length === 1) {
      proximityScore += 20; // 近隣市区町村の可能性
    }
  } else if (commonWords.length > 0) {
    // 近隣県の可能性
    proximityScore += 15;
    console.log('Neighboring area possible');
  }

  // 犬の移動能力を考慮した追加評価
  // 大型犬: 1-2km/日、中型犬: 0.5-1km/日、小型犬: 0.2-0.5km/日
  const petSize = missingPet.size || 'medium';
  if (proximityScore > 50) {
    if (petSize.includes('大') || petSize.includes('70cm')) {
      proximityScore = Math.min(100, proximityScore + 10); // 大型犬は移動能力高
    } else if (petSize.includes('小') || petSize.includes('30cm')) {
      proximityScore = Math.max(50, proximityScore - 10); // 小型犬は移動能力低
    }
  }

  console.log(`Final proximity score: ${proximityScore}%`);
  return Math.round(proximityScore);
}

// 時間差を計算（日数）
function calculateTimeDifference(missingPet: PetInfo, foundPet: FoundPetInfo): number {
  const missingDate = new Date(missingPet.lastSeen?.date || Date.now());
  const foundDate = new Date(foundPet.foundDate || Date.now());
  const diffTime = Math.abs(foundDate.getTime() - missingDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  console.log(`Time difference: ${diffDays} days between ${missingPet.lastSeen?.date} and ${foundPet.foundDate}`);
  return diffDays;
}

// 時間経過に基づくマッチ度計算（犬の生存率考慮）
function calculateTimeMatchScore(missingPet: PetInfo, foundPet: FoundPetInfo): number {
  const diffDays = calculateTimeDifference(missingPet, foundPet);
  
  // 犬の迷子時生存率に基づくスコア計算
  // 研究データ: 1日目95%, 3日目85%, 7日目70%, 14日目50%, 30日目25%
  let timeScore = 0;
  
  if (diffDays === 0) {
    timeScore = 100; // 同日発見
  } else if (diffDays === 1) {
    timeScore = 95; // 1日後
  } else if (diffDays <= 3) {
    timeScore = 85; // 3日以内
  } else if (diffDays <= 7) {
    timeScore = 70; // 1週間以内
  } else if (diffDays <= 14) {
    timeScore = 50; // 2週間以内
  } else if (diffDays <= 30) {
    timeScore = 25; // 1ヶ月以内
  } else if (diffDays <= 90) {
    timeScore = 10; // 3ヶ月以内（稀なケース）
  } else {
    timeScore = 2; // 3ヶ月超（非常に稀）
  }

  // ペットのサイズ・年齢による補正
  const petSize = missingPet.size || 'medium';
  const ageYears = parseInt(missingPet.age || '5');
  
  // 大型犬は生存能力が高い
  if (petSize.includes('大') || petSize.includes('70cm')) {
    timeScore = Math.min(100, timeScore + 10);
  }
  
  // 小型犬や老犬は生存能力が低い
  if (petSize.includes('小') || petSize.includes('30cm') || ageYears > 10) {
    timeScore = Math.max(5, timeScore - 15);
  }
  
  // 若い犬は生存能力が高い
  if (ageYears < 3) {
    timeScore = Math.min(100, timeScore + 5);
  }

  console.log(`Time match score: ${timeScore}% (${diffDays} days, size: ${petSize}, age: ${ageYears})`);
  return Math.round(timeScore);
}

// 詳細なスコア内訳を計算
async function calculateDetailedScores(missingPet: PetInfo, foundPet: FoundPetInfo) {
  const scores = {
    // 基本情報
    petType: {
      score: missingPet.type?.toLowerCase() === foundPet.petType?.toLowerCase() ? 100 : 0,
      missingValue: missingPet.type || missingPet.petType,
      foundValue: foundPet.petType,
      weight: 25,
      description: '動物の種類'
    },
    size: {
      score: missingPet.size === foundPet.size ? 100 : 0,
      missingValue: missingPet.size,
      foundValue: foundPet.size,
      weight: 20,
      description: 'サイズ'
    },
    color: {
      score: missingPet.colors?.[0] && foundPet.color && 
             missingPet.colors[0].toLowerCase().includes(foundPet.color.toLowerCase()) ? 100 : 0,
      missingValue: missingPet.colors?.join(', '),
      foundValue: foundPet.color,
      weight: 15,
      description: '毛色'
    },
    location: {
      score: calculateLocationProximity(missingPet, foundPet),
      missingValue: missingPet.lastSeen?.location,
      foundValue: foundPet.foundAddress,
      weight: 15,
      description: '発見場所の近さ'
    },
    // 外見の特徴
    features: {
      score: await calculateFeatureMatch(missingPet, foundPet),
      missingValue: missingPet.specialFeatures,
      foundValue: foundPet.features,
      weight: 10,
      description: '外見の特徴'
    },
    collar: {
      score: calculateCollarMatch(missingPet, foundPet),
      missingValue: '情報なし', // 迷子ペットには首輪情報がない場合が多い
      foundValue: foundPet.hasCollar ? `あり: ${foundPet.collarDescription}` : 'なし',
      weight: 5,
      description: '首輪'
    },
    // 時間的要素（犬の生存率に基づく）
    timeDifference: {
      score: calculateTimeMatchScore(missingPet, foundPet),
      missingValue: missingPet.lastSeen?.date,
      foundValue: foundPet.foundDate,
      weight: 10,
      description: '時間の近さ（生存率考慮）'
    }
  };

  // 総合スコアを計算
  const totalWeightedScore = Object.values(scores).reduce((sum, item) => 
    sum + (item.score * item.weight / 100), 0
  );
  const totalWeight = Object.values(scores).reduce((sum, item) => sum + item.weight, 0);
  const overallScore = Math.round(totalWeightedScore);

  return {
    scores,
    overallScore,
    totalWeight,
    breakdown: Object.entries(scores).map(([key, value]) => ({
      category: key,
      ...value,
      weightedScore: Math.round(value.score * value.weight / 100)
    }))
  };
}

// 特徴のマッチング度を計算（Gemini APIを使用）
async function calculateFeatureMatch(missingPet: PetInfo, foundPet: FoundPetInfo): Promise<number> {
  const missingFeatures = missingPet.specialFeatures || '';
  const foundFeatures = foundPet.features || '';
  
  if (!missingFeatures || !foundFeatures) return 0;
  
  try {
    const prompt = `
以下の2つのペットの外見の特徴を比較し、一致度を0-100の数値で評価してください。
部分的な一致や意味的な一致も考慮してください。

迷子ペットの特徴: ${missingFeatures}
発見ペットの特徴: ${foundFeatures}

例：
- 「全体は茶色だけど足の色が白い」と「足が白色」→ 高い一致度（70-90）
- 「耳が垂れている」と「垂れ耳」→ 高い一致度（80-100）
- 「黒い斑点がある」と「黒い模様」→ 中程度の一致度（50-70）

数値のみを返してください。`;
    
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const score = parseInt(text);
    
    if (!isNaN(score) && score >= 0 && score <= 100) {
      console.log(`Feature match score via AI: ${score}% for "${missingFeatures}" vs "${foundFeatures}"`);
      return score;
    }
  } catch (error) {
    console.error('Error using Gemini for feature matching:', error);
  }
  
  // フォールバック: 簡易的なキーワードマッチング
  const missingWords = missingFeatures.toLowerCase().split(/[,、。\s]+/).filter(w => w.length > 1);
  const foundWords = foundFeatures.toLowerCase().split(/[,、。\s]+/).filter(w => w.length > 1);
  
  if (missingWords.length === 0 || foundWords.length === 0) return 0;
  
  const matchingWords = missingWords.filter(word => 
    foundWords.some(fWord => fWord.includes(word) || word.includes(fWord))
  );
  
  return Math.round((matchingWords.length / missingWords.length) * 100);
}

// 首輪のマッチング度を計算
function calculateCollarMatch(missingPet: PetInfo, foundPet: FoundPetInfo): number {
  // 迷子ペットに首輪の情報がない場合は中立的なスコア
  if (!foundPet.hasCollar) return 50; // 首輪なし = 普通
  
  // 首輪ありで詳細情報があれば高スコア
  if (foundPet.hasCollar && foundPet.collarDescription) return 80;
  
  // 首輪ありだが詳細不明
  return 60;
}

/**
 * 発見ペット/迷子ペットに対して自動マッチングを実行
 */
export async function POST(request: NextRequest) {
  try {
    const { foundPetId, missingPetId } = await request.json();
    
    console.log('=== Auto-match API called ===');
    console.log('foundPetId:', foundPetId);
    console.log('missingPetId:', missingPetId);

    if (!foundPetId && !missingPetId) {
      return NextResponse.json(
        { error: 'Either foundPetId or missingPetId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const agent = getAgent();
    const matches = [];

    if (foundPetId) {
      // 発見ペットに対する迷子ペットマッチング
      const foundPetDoc = await db.collection('foundPets').doc(foundPetId).get();
      if (!foundPetDoc.exists) {
        return NextResponse.json(
          { error: 'Found pet not found' },
          { status: 404 }
        );
      }

      const foundPet = { id: foundPetId, ...foundPetDoc.data() } as FoundPetInfo & { id: string };

      // すべての迷子ペットを取得（ステータスが'missing'のもの）
      const missingPetsSnapshot = await db
        .collection('pets')
        .where('status', '==', 'missing')
        .get();

      console.log(`Starting auto-match for found pet ${foundPetId}`);
      console.log(`Found ${missingPetsSnapshot.size} missing pets to match against`);

      // 各迷子ペットとマッチング
      for (const doc of missingPetsSnapshot.docs) {
        const missingPet = { id: doc.id, ...doc.data() } as PetInfo & { id: string };
        
        try {
          console.log(`Matching with missing pet ${doc.id} (${missingPet.name})`);
          
          // AIマッチングを優先実行
          const matchResult = await agent.matchPets(missingPet, foundPet);
          console.log(`AI match score for ${missingPet.name}: ${matchResult.matchScore}%`);
          
          // スコアが30%以上のマッチを保存
          if (matchResult.matchScore >= 30) {
            // 詳細なスコア内訳を計算
            const detailedScores = await calculateDetailedScores(missingPet, foundPet);
            
            // マッチング結果をデータベースに保存
            console.log(`Saving match to database: missingPet=${missingPet.name}, foundPet=${foundPet.petType}, score=${matchResult.matchScore}%`);
            
            // undefined値を除去するためのクリーンな結果オブジェクトを作成
            const cleanMatchResult = {
              missingPetId: matchResult.missingPetId,
              foundPetId: matchResult.foundPetId,
              matchScore: matchResult.matchScore || 0,
              visualSimilarity: matchResult.visualSimilarity || 0,
              locationProximity: matchResult.locationProximity || 0,
              timeDifference: matchResult.timeDifference || 0,
              confidence: matchResult.confidence || 0,
              matchDetails: matchResult.matchDetails || {},
              recommendedAction: matchResult.recommendedAction || 'low_match'
            };
            
            // 保存するデータオブジェクトを構築
            const matchData = {
              ...cleanMatchResult,
              missingPetName: missingPet.name,
              missingPetType: missingPet.type,
              foundPetType: foundPet.petType,
              // 詳細なスコア内訳を追加
              detailedScores,
              // 完全なペット情報を追加
              missingPet: {
                id: missingPet.id,
                name: missingPet.name || missingPet.petName,
                type: missingPet.type || missingPet.petType,
                size: missingPet.size,
                color: missingPet.color,
                colors: missingPet.colors || [missingPet.color],
                features: missingPet.features || missingPet.specialFeatures,
                ageYears: missingPet.ageYears,
                ageMonths: missingPet.ageMonths,
                microchipNumber: missingPet.microchipNumber,
                lastSeen: {
                  location: missingPet.lastSeenAddress || missingPet.lastSeen?.location,
                  date: missingPet.lastSeenDate || missingPet.lastSeen?.date,
                  time: missingPet.lastSeenTime || missingPet.lastSeen?.time,
                  details: missingPet.lastSeenDetails || missingPet.lastSeen?.details
                },
                contactInfo: {
                  name: missingPet.ownerName,
                  phone: missingPet.ownerPhone,
                  email: missingPet.ownerEmail
                },
                images: missingPet.images || [],
                lostReason: missingPet.lostReason,
                additionalInfo: missingPet.additionalInfo
              },
              foundPet: {
                id: foundPet.id,
                petType: foundPet.petType,
                size: foundPet.size,
                color: foundPet.color,
                features: foundPet.features,
                hasCollar: foundPet.hasCollar,
                collarDescription: foundPet.collarDescription,
                foundAddress: foundPet.foundAddress,
                foundDate: foundPet.foundDate,
                foundTime: foundPet.foundTime,
                foundLocationDetails: foundPet.foundLocationDetails,
                currentLocation: foundPet.currentLocation,
                petCondition: foundPet.petCondition,
                finderName: foundPet.finderName,
                finderPhone: foundPet.finderPhone,
                finderEmail: foundPet.finderEmail,
                canKeepTemporarily: foundPet.canKeepTemporarily,
                keepUntilDate: foundPet.keepUntilDate,
                imageUrls: foundPet.imageUrls || [],
                additionalInfo: foundPet.additionalInfo
              },
              createdAt: new Date(),
              status: 'pending',
            };
            
            // undefined値を削除してからFirestoreに保存
            const cleanData = removeUndefinedFields(matchData);
            const matchDoc = await db.collection('matches').add(cleanData);

            matches.push({
              id: matchDoc.id,
              ...matchResult,
              detailedScores,
              missingPet: {
                id: missingPet.id,
                name: missingPet.name,
                type: missingPet.type,
                imageUrl: missingPet.images?.[0],
              }
            });

            console.log(`AI match saved with score ${matchResult.matchScore}%`);
            continue; // AIマッチングが成功したらベーシックマッチングはスキップ
          }
          
          // AIマッチングスコアが低い場合、詳細ログで原因を調査
          console.log(`AI match score too low (${matchResult.matchScore}%), analyzing reasons...`);
          console.log('Missing pet data:', {
            name: missingPet.name,
            type: missingPet.type,
            size: missingPet.size,
            color: missingPet.color,
            images: missingPet.images?.length || 0
          });
          console.log('Found pet data:', {
            petType: foundPet.petType,
            size: foundPet.size,
            color: foundPet.color,
            images: foundPet.imageUrls?.length || 0
          });
          
          // AIマッチング結果を閾値を下げて保存（デバッグ用）
          if (matchResult.matchScore >= 10) {
            console.log('Saving low-score AI match for analysis...');
            const detailedScores = await calculateDetailedScores(missingPet, foundPet);
            
            const matchDoc = await db.collection('matches').add({
              ...matchResult,
              missingPetName: missingPet.name,
              missingPetType: missingPet.type,
              foundPetType: foundPet.petType,
              detailedScores,
              matchType: 'ai_low_score',
              // 完全なペット情報を含める
              missingPet: {
                id: missingPet.id,
                name: missingPet.name || missingPet.petName,
                type: missingPet.type || missingPet.petType,
                size: missingPet.size,
                color: missingPet.color,
                colors: missingPet.colors || [missingPet.color],
                features: missingPet.features || missingPet.specialFeatures,
                lastSeen: {
                  location: missingPet.lastSeenAddress || missingPet.lastSeen?.location,
                  date: missingPet.lastSeenDate || missingPet.lastSeen?.date,
                },
                contactInfo: {
                  name: missingPet.ownerName,
                  phone: missingPet.ownerPhone,
                  email: missingPet.ownerEmail
                },
                images: missingPet.images || []
              },
              foundPet: {
                id: foundPet.id,
                petType: foundPet.petType,
                size: foundPet.size,
                color: foundPet.color,
                foundAddress: foundPet.foundAddress,
                foundDate: foundPet.foundDate,
                finderName: foundPet.finderName,
                finderPhone: foundPet.finderPhone,
                finderEmail: foundPet.finderEmail,
                imageUrls: foundPet.imageUrls || []
              },
              createdAt: new Date(),
              status: 'pending',
            });

            matches.push({
              id: matchDoc.id,
              ...matchResult,
              detailedScores,
              missingPet: {
                id: missingPet.id,
                name: missingPet.name,
                type: missingPet.type,
                imageUrl: missingPet.images?.[0],
              }
            });
            
            console.log(`Low-score AI match saved with score ${matchResult.matchScore}%`);
            continue;
          }
          
          // 最後の手段としてベーシックマッチ
          console.log('AI match failed completely, trying basic match as fallback...');
          const basicScore = calculateBasicMatch(missingPet, foundPet);
          console.log(`Basic match score: ${basicScore}%`);
          
          if (basicScore >= 50) {
            // 直接matchesコレクションに保存（詳細情報付き）
            const matchDoc = await db.collection('matches').add({
              missingPetId: missingPet.id,
              foundPetId: foundPet.id,
              matchScore: basicScore,
              visualSimilarity: 0, // ベーシックマッチ（画像解析なし）
              locationProximity: calculateLocationProximity(missingPet, foundPet),
              timeDifference: calculateTimeDifference(missingPet, foundPet),
              timeMatchScore: calculateTimeMatchScore(missingPet, foundPet),
              confidence: 0.5, // ベーシックマッチの信頼度
              matchType: 'basic_forced',
              missingPetName: missingPet.name,
              missingPetType: missingPet.type,
              foundPetType: foundPet.petType,
              matchDetails: {
                type: missingPet.type?.toLowerCase() === foundPet.petType?.toLowerCase(),
                size: missingPet.size === foundPet.size,
                color: missingPet.color && foundPet.color && 
                       missingPet.color.toLowerCase().includes(foundPet.color.toLowerCase()) ? [missingPet.color] : [],
                features: []
              },
              // 迷子ペット詳細
              missingPet: {
                id: missingPet.id,
                name: missingPet.name || missingPet.petName,
                type: missingPet.type || missingPet.petType,
                size: missingPet.size,
                colors: missingPet.colors || [missingPet.color],
                lastSeen: {
                  location: missingPet.lastSeenAddress || missingPet.lastSeen?.location,
                  date: missingPet.lastSeenDate || missingPet.lastSeen?.date
                },
                contactInfo: {
                  name: missingPet.ownerName,
                  phone: missingPet.ownerPhone,
                  email: missingPet.ownerEmail
                },
                images: missingPet.images || []
              },
              // 発見ペット詳細
              foundPet: {
                id: foundPet.id,
                petType: foundPet.petType,
                size: foundPet.size,
                color: foundPet.color,
                foundAddress: foundPet.foundAddress,
                foundDate: foundPet.foundDate,
                finderName: foundPet.finderName,
                finderPhone: foundPet.finderPhone,
                finderEmail: foundPet.finderEmail,
                imageUrls: foundPet.imageUrls || []
              },
              createdAt: new Date(),
              status: 'pending',
              recommendedAction: basicScore >= 50 ? 'possible_match' : 'low_match',
            });

            matches.push({
              id: matchDoc.id,
              matchScore: basicScore,
              missingPet: {
                id: missingPet.id,
                name: missingPet.name,
                type: missingPet.type,
                imageUrl: missingPet.images?.[0],
              }
            });
            
            console.log(`Basic match saved with score ${basicScore}%`);
          }
        } catch (error) {
          console.error(`Failed to match with pet ${doc.id}:`, error);
        }
      }

      // スコアの高い順にソート
      matches.sort((a, b) => b.matchScore - a.matchScore);

      console.log(`Auto-match completed for found pet. Found ${matches.length} potential matches`);

      return NextResponse.json({
        success: true,
        foundPetId,
        totalMissingPets: missingPetsSnapshot.size,
        matchesFound: matches.length,
        matches: matches.slice(0, 10), // 上位10件を返す
        agentStatus: agent.getStatus(),
      });

    } else if (missingPetId) {
      // 迷子ペットに対する発見ペットマッチング
      const missingPetDoc = await db.collection('pets').doc(missingPetId).get();
      if (!missingPetDoc.exists) {
        return NextResponse.json(
          { error: 'Missing pet not found' },
          { status: 404 }
        );
      }

      const missingPet = { id: missingPetId, ...missingPetDoc.data() } as PetInfo & { id: string };

      // すべての発見ペットを取得（ステータスが'found'のもの）
      const foundPetsSnapshot = await db
        .collection('foundPets')
        .where('status', '==', 'found')
        .get();

      console.log(`Starting auto-match for missing pet ${missingPetId}`);
      console.log(`Found ${foundPetsSnapshot.size} found pets to match against`);

      // 各発見ペットとマッチング
      for (const doc of foundPetsSnapshot.docs) {
        const foundPet = { id: doc.id, ...doc.data() } as FoundPetInfo & { id: string };
        
        try {
          console.log(`Matching with found pet ${doc.id} (${foundPet.petType})`);
          
          const matchResult = await agent.matchPets(missingPet, foundPet);
          
          // スコアが30%以上のマッチを保存
          if (matchResult.matchScore >= 30) {
            // マッチング結果をデータベースに保存
            const matchDoc = await db.collection('matches').add({
              ...matchResult,
              missingPetName: missingPet.name,
              missingPetType: missingPet.type,
              foundPetType: foundPet.petType,
              createdAt: new Date(),
              status: 'pending',
            });

            matches.push({
              id: matchDoc.id,
              ...matchResult,
              foundPet: {
                id: foundPet.id,
                petType: foundPet.petType,
                imageUrl: foundPet.imageUrls?.[0],
                foundAddress: foundPet.foundAddress,
              }
            });

            console.log(`Match saved with score ${matchResult.matchScore}%`);
          }
        } catch (error) {
          console.error(`Failed to match with pet ${doc.id}:`, error);
        }
      }

      // スコアの高い順にソート
      matches.sort((a, b) => b.matchScore - a.matchScore);

      console.log(`Auto-match completed for missing pet. Found ${matches.length} potential matches`);

      return NextResponse.json({
        success: true,
        missingPetId,
        totalFoundPets: foundPetsSnapshot.size,
        matchesFound: matches.length,
        matches: matches.slice(0, 10), // 上位10件を返す
        agentStatus: agent.getStatus(),
      });
    }
  } catch (error) {
    console.error('Auto-match error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform auto-match',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}