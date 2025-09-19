import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin/config';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { 
      petId, 
      ownerId, 
      finderId, 
      ownerNickname, 
      finderNickname, 
      petName 
    } = await request.json();

    const adminDb = getAdminFirestore();

    // 既存のチャットルームがないか確認
    const existingRoomsSnapshot = await adminDb
      .collection('chatRooms')
      .where('petId', '==', petId)
      .where('ownerId', '==', ownerId)
      .where('finderId', '==', finderId)
      .get();
    
    if (!existingRoomsSnapshot.empty) {
      // 既存のルームがある場合はそのIDを返す
      return NextResponse.json({ 
        roomId: existingRoomsSnapshot.docs[0].id,
        existing: true 
      });
    }

    // 新しいチャットルームを作成
    const roomData = {
      petId,
      ownerId,
      finderId,
      ownerNickname,
      finderNickname,
      petName,
      participants: [ownerId, finderId], // クエリ用の配列
      createdAt: FieldValue.serverTimestamp(),
      lastMessageTime: FieldValue.serverTimestamp()
    };

    const docRef = await adminDb.collection('chatRooms').add(roomData);

    return NextResponse.json({ 
      roomId: docRef.id,
      existing: false 
    });
  } catch (error) {
    console.error('チャットルーム作成エラー:', error);
    return NextResponse.json(
      { error: 'チャットルームの作成に失敗しました' },
      { status: 500 }
    );
  }
}