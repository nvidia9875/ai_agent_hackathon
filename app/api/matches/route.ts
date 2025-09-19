import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin/config';

/**
 * 保存されているマッチング結果を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const db = getAdminFirestore();
    
    // マッチング結果を取得（新しい順）
    const matchesSnapshot = await db
      .collection('matches')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const matches = [];
    
    for (const doc of matchesSnapshot.docs) {
      const matchData = doc.data();
      
      // 迷子ペットの情報を取得
      let missingPet = null;
      if (matchData.missingPetId) {
        const missingPetDoc = await db.collection('pets').doc(matchData.missingPetId).get();
        if (missingPetDoc.exists) {
          missingPet = { id: missingPetDoc.id, ...missingPetDoc.data() };
        }
      }
      
      // 発見ペットの情報を取得
      let foundPet = null;
      if (matchData.foundPetId) {
        const foundPetDoc = await db.collection('foundPets').doc(matchData.foundPetId).get();
        if (foundPetDoc.exists) {
          foundPet = { id: foundPetDoc.id, ...foundPetDoc.data() };
        }
      }
      
      matches.push({
        id: doc.id,
        ...matchData,
        missingPet,
        foundPet,
      });
    }
    
    // スコアの高い順にソート
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return NextResponse.json({
      success: true,
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch matches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 新しいマッチング結果を保存
 */
export async function POST(request: NextRequest) {
  try {
    const matchData = await request.json();
    
    const db = getAdminFirestore();
    
    // マッチング結果を保存
    const docRef = await db.collection('matches').add({
      ...matchData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      matchId: docRef.id,
    });
  } catch (error) {
    console.error('Error saving match:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save match',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}