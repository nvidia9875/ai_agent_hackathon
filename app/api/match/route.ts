import { NextRequest, NextResponse } from 'next/server';
import { VisualDetectiveAgent } from '@/agents/visual-detective';
import { getAdminFirestore } from '@/lib/firebase-admin/config';

// エージェントのシングルトンインスタンス
let visualDetectiveAgent: VisualDetectiveAgent | null = null;

function getAgent() {
  if (!visualDetectiveAgent) {
    visualDetectiveAgent = new VisualDetectiveAgent();
  }
  return visualDetectiveAgent;
}

/**
 * 迷子ペットと発見ペットをマッチング
 */
export async function POST(request: NextRequest) {
  try {
    const { missingPetId, foundPetId } = await request.json();

    if (!missingPetId || !foundPetId) {
      return NextResponse.json(
        { error: 'Missing pet ID or found pet ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // 迷子ペット情報を取得
    const missingPetDoc = await db.collection('pets').doc(missingPetId).get();
    if (!missingPetDoc.exists) {
      return NextResponse.json(
        { error: 'Missing pet not found' },
        { status: 404 }
      );
    }

    // 発見ペット情報を取得
    const foundPetDoc = await db.collection('foundPets').doc(foundPetId).get();
    if (!foundPetDoc.exists) {
      return NextResponse.json(
        { error: 'Found pet not found' },
        { status: 404 }
      );
    }

    const missingPet = { id: missingPetId, ...missingPetDoc.data() } as any;
    const foundPet = { id: foundPetId, ...foundPetDoc.data() } as any;

    // Visual Detective Agentでマッチング
    const agent = getAgent();
    const matchResult = await agent.matchPets(missingPet, foundPet);

    // マッチング結果をデータベースに保存
    await db.collection('matches').add({
      ...matchResult,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      match: matchResult,
      agentStatus: agent.getStatus(),
    });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to match pets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * すべての迷子ペットに対して発見ペットをマッチング
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const foundPetId = searchParams.get('foundPetId');

    if (!foundPetId) {
      return NextResponse.json(
        { error: 'Found pet ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // 発見ペット情報を取得
    const foundPetDoc = await db.collection('foundPets').doc(foundPetId).get();
    if (!foundPetDoc.exists) {
      return NextResponse.json(
        { error: 'Found pet not found' },
        { status: 404 }
      );
    }

    const foundPet = { id: foundPetId, ...foundPetDoc.data() } as any;

    // すべての迷子ペットを取得（ステータスが'missing'のもの）
    const missingPetsSnapshot = await db
      .collection('pets')
      .where('status', '==', 'missing')
      .get();

    const agent = getAgent();
    const matches = [];

    // 各迷子ペットとマッチング
    for (const doc of missingPetsSnapshot.docs) {
      const missingPet = { id: doc.id, ...doc.data() } as any;
      
      try {
        const matchResult = await agent.matchPets(missingPet, foundPet);
        
        // スコアが30%以上のマッチのみ返す
        if (matchResult.matchScore >= 30) {
          matches.push({
            ...matchResult,
            missingPet: {
              id: missingPet.id,
              name: missingPet.name,
              type: missingPet.type,
              imageUrl: missingPet.images?.[0],
            }
          });
        }
      } catch (error) {
        console.error(`Failed to match with pet ${doc.id}:`, error);
      }
    }

    // スコアの高い順にソート
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      matches: matches.slice(0, 10), // 上位10件を返す
      totalMatches: matches.length,
      agentStatus: getAgent().getStatus(),
    });
  } catch (error) {
    console.error('Batch matching error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform batch matching',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}