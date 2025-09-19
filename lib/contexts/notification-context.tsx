'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDocs,
  updateDoc
} from 'firebase/firestore';

interface ChatNotification {
  roomId: string;
  petName: string;
  senderName: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: Timestamp;
}

interface NotificationContextType {
  unreadCount: number;
  hasNewNotifications: boolean;
  chatNotifications: ChatNotification[];
  markAsRead: () => void;
  markRoomAsRead: (roomId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setHasNewNotifications(false);
      setChatNotifications([]);
      return;
    }

    // 各チャットルームをグローバルに監視する
    const allMessagesQuery = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(allMessagesQuery, async (snapshot) => {
      let totalUnread = 0;
      const notifications: ChatNotification[] = [];

      // Promise.allを使用して並列処理
      for (const roomDoc of snapshot.docs) {
        const roomData = roomDoc.data();
        
        const messagesQuery = query(
          collection(db, 'chatRooms', roomDoc.id, 'messages'),
          where('senderId', '!=', user.uid),
          where('read', '==', false)
        );
        
        const unreadMessages = await new Promise<any[]>((resolve) => {
          const unsub = onSnapshot(messagesQuery, (snap) => {
            resolve(snap.docs);
            unsub();
          });
        });
        
        if (unreadMessages.length > 0) {
          totalUnread += unreadMessages.length;
          
          // 最新の未読メッセージを取得
          const latestMessage = unreadMessages.sort((a, b) => 
            b.data().timestamp?.toMillis() - a.data().timestamp?.toMillis()
          )[0];
          
          const messageData = latestMessage.data();
          
          notifications.push({
            roomId: roomDoc.id,
            petName: roomData.petName || 'ペット',
            senderName: messageData.senderNickname || '匿名ユーザー',
            lastMessage: messageData.text || '',
            unreadCount: unreadMessages.length,
            timestamp: messageData.timestamp || Timestamp.now()
          });
        }
      }
      
      const previousCount = unreadCount;
      setUnreadCount(totalUnread);
      setChatNotifications(notifications);
      
      // 新しい通知があるかチェック
      if (totalUnread > previousCount && previousCount >= 0) {
        setHasNewNotifications(true);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = () => {
    setHasNewNotifications(false);
  };

  const markRoomAsRead = async (roomId: string) => {
    if (!user) return;
    
    try {
      // 該当ルームのすべての未読メッセージを既読にする
      const messagesQuery = query(
        collection(db, 'chatRooms', roomId, 'messages'),
        where('senderId', '!=', user.uid),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(messagesQuery);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );
      
      await Promise.all(updatePromises);
      
      // 通知リストから該当ルームを削除
      setChatNotifications(prev => prev.filter(n => n.roomId !== roomId));
      
      // 未読カウントを再計算
      const newUnreadCount = chatNotifications
        .filter(n => n.roomId !== roomId)
        .reduce((sum, n) => sum + n.unreadCount, 0);
      setUnreadCount(newUnreadCount);
      
      if (newUnreadCount === 0) {
        setHasNewNotifications(false);
      }
    } catch (error) {
      console.error('Failed to mark room as read:', error);
    }
  };

  const value = {
    unreadCount,
    hasNewNotifications,
    chatNotifications,
    markAsRead,
    markRoomAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}