'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Badge,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  Pets as PetsIcon,
  ArrowBack as ArrowBackIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth/auth-context';
import { useNotifications } from '@/lib/contexts/notification-context';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderNickname: string;
  timestamp: Timestamp;
  read: boolean;
}

interface ChatRoom {
  id: string;
  petId: string;
  ownerId: string;
  finderId: string;
  ownerNickname: string;
  finderNickname: string;
  petName: string;
  petImage?: string;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  createdAt: Timestamp;
  petCondition?: string;
  canKeepTemporarily?: boolean;
  keepUntilDate?: string;
  currentLocation?: string;
}

interface ChatUser {
  id: string;
  nickname: string;
  lastSeen?: Timestamp;
  online?: boolean;
}

export default function ChatPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [petImage, setPetImage] = useState<string | null>(null);
  const [petStatus, setPetStatus] = useState<{
    condition?: string;
    canKeepTemporarily?: boolean;
    keepUntilDate?: string;
    currentLocation?: string;
  }>({});
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { markRoomAsRead } = useNotifications();
  
  const roomId = searchParams.get('roomId');

  // ページスクロールを無効化
  useEffect(() => {
    document.body.classList.add('chat-page');
    return () => {
      document.body.classList.remove('chat-page');
    };
  }, []);

  // チャットルーム一覧を取得
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rooms: ChatRoom[] = [];
      for (const docSnap of snapshot.docs) {
        const roomData = docSnap.data();
        const room: ChatRoom = { id: docSnap.id, ...roomData } as ChatRoom;
        
        // ペット情報から画像を取得
        if (roomData.petId) {
          const petDoc = await getDoc(doc(db, 'pets', roomData.petId));
          if (petDoc.exists()) {
            const petData = petDoc.data();
            if (petData.images && petData.images.length > 0) {
              room.petImage = petData.images[0];
            }
          }
        }
        
        // 未読メッセージ数を取得
        const unreadQuery = query(
          collection(db, 'chatRooms', docSnap.id, 'messages'),
          where('senderId', '!=', user.uid),
          where('read', '==', false)
        );
        const unreadSnapshot = await getDocs(unreadQuery);
        room.unreadCount = unreadSnapshot.size;
        
        rooms.push(room);
      }
      setChatRooms(rooms);
      setLoading(false);

      // URLパラメータでroomIdが指定されている場合は自動選択
      if (roomId && !selectedRoom) {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
          setSelectedRoom(room);
        }
      }
    });

    return () => unsubscribe();
  }, [user, roomId, selectedRoom]);

  // 選択されたルームのメッセージを取得
  useEffect(() => {
    if (!selectedRoom) return;
    
    // 選択されたルームのペット画像とステータス情報を取得
    setPetImage(selectedRoom.petImage || null);
    
    // 発見ペット情報を取得してステータス情報を設定
    const fetchPetStatus = async () => {
      try {
        // まず、マッチング情報から発見ペットIDを取得
        const matchesQuery = query(
          collection(db, 'matches'),
          where('missingPetId', '==', selectedRoom.petId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        
        if (!matchesSnapshot.empty) {
          const matchData = matchesSnapshot.docs[0].data();
          const foundPetId = matchData.foundPetId;
          
          if (foundPetId) {
            // 発見ペット情報を取得
            const foundPetDoc = await getDoc(doc(db, 'foundPets', foundPetId));
            if (foundPetDoc.exists()) {
              const foundPetData = foundPetDoc.data();
              setPetStatus({
                condition: foundPetData.petCondition,
                canKeepTemporarily: foundPetData.canKeepTemporarily,
                keepUntilDate: foundPetData.keepUntilDate,
                currentLocation: foundPetData.currentLocation
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching pet status:', error);
      }
    };
    
    fetchPetStatus();
    
    // 該当ルームの通知をリセット
    markRoomAsRead(selectedRoom.id);

    const q = query(
      collection(db, 'chatRooms', selectedRoom.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({ id: doc.id, ...data } as Message);
      });
      
      setMessages(msgs);
      scrollToBottom();
    });

    // 相手のユーザー情報を取得
    const otherUserId = selectedRoom.ownerId === user?.uid 
      ? selectedRoom.finderId 
      : selectedRoom.ownerId;
    
    const otherNickname = selectedRoom.ownerId === user?.uid 
      ? selectedRoom.finderNickname 
      : selectedRoom.ownerNickname;
    
    setOtherUser({
      id: otherUserId,
      nickname: otherNickname
    });

    return () => unsubscribe();
  }, [selectedRoom, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !user) return;

    setSending(true);
    try {
      const messageData = {
        text: newMessage,
        senderId: user.uid,
        senderNickname: selectedRoom.ownerId === user.uid 
          ? selectedRoom.ownerNickname 
          : selectedRoom.finderNickname,
        timestamp: serverTimestamp(),
        read: false
      };

      await addDoc(
        collection(db, 'chatRooms', selectedRoom.id, 'messages'),
        messageData
      );

      // チャットルームの最終メッセージを更新
      await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
        lastMessage: newMessage,
        lastMessageTime: serverTimestamp()
      });

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
    }
  };

  const handleResolveCase = async () => {
    if (!selectedRoom || !user) return;

    setResolving(true);
    try {
      // チャットルームのステータスを解決済みに更新
      await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: user.uid
      });

      // 関連するマッチング結果のステータスを更新
      const matchesQuery = query(
        collection(db, 'matches'),
        where('missingPetId', '==', selectedRoom.petId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      
      const updatePromises = matchesSnapshot.docs.map(matchDoc =>
        updateDoc(matchDoc.ref, {
          status: 'resolved',
          resolvedAt: serverTimestamp()
        })
      );

      // 迷子ペットのステータスを解決済みに更新
      await updateDoc(doc(db, 'pets', selectedRoom.petId), {
        status: 'reunited',
        resolvedAt: serverTimestamp()
      });

      await Promise.all(updatePromises);

      setResolveModalOpen(false);
      // チャット画面を閉じるかリフレッシュする
      window.location.reload();
    } catch (error) {
      console.error('解決処理エラー:', error);
      alert('解決処理に失敗しました。もう一度お試しください。');
    } finally {
      setResolving(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      bgcolor: '#93AAD4', 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: '64px' // ヘッダーの高さ分の余白
    }}>
      <Box sx={{ width: 240 }}>
        <Sidebar />
      </Box>
      
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        position: 'relative', 
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* チャットルーム一覧 */}
        <Paper 
          elevation={0} 
          sx={{ 
            width: 320, 
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="600">
              チャット
            </Typography>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : chatRooms.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <PetsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography color="text.secondary">
                まだチャットはありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                マッチングが成立すると
                <br />
                ここにチャットが表示されます
              </Typography>
            </Box>
          ) : (
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {chatRooms.map((room) => {
                const isOwner = room.ownerId === user?.uid;
                const displayName = isOwner ? room.finderNickname : room.ownerNickname;
                const unread = room.unreadCount || 0;
                
                return (
                  <ListItem
                    key={room.id}
                    selected={selectedRoom?.id === room.id}
                    onClick={() => setSelectedRoom(room)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                        transform: 'translateX(2px)'
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(33, 150, 243, 0.08)',
                        borderLeft: '4px solid',
                        borderColor: '#2196f3',
                        '&:hover': {
                          bgcolor: 'rgba(33, 150, 243, 0.12)'
                        }
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={unread} color="error">
                        <Avatar 
                          src={room.petImage}
                          sx={{ bgcolor: 'primary.100' }}
                        >
                          {!room.petImage && <PetsIcon color="primary" />}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight="600">
                            {displayName}
                          </Typography>
                          <Chip 
                            label={room.petName} 
                            size="small" 
                            sx={{ height: 18 }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block'
                            }}
                          >
                            {room.lastMessage || '会話を始めましょう'}
                          </Typography>
                          {room.lastMessageTime && (
                            <Typography 
                              component="span"
                              variant="caption" 
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              {formatTime(room.lastMessageTime)}
                            </Typography>
                          )}
                        </>
                      }
                      secondaryTypographyProps={{
                        component: 'div'
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Paper>

        {/* チャット画面 */}
        {selectedRoom ? (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* チャットヘッダー - 固定 */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                bgcolor: '#2C3E5B',
                color: 'white',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={petImage || undefined}
                  sx={{ 
                    bgcolor: 'white',
                    width: 48,
                    height: 48
                  }}
                >
                  {!petImage && <PetsIcon sx={{ color: '#2C3E5B' }} />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ color: 'white' }}>
                    {otherUser?.nickname}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {selectedRoom.petName}について
                  </Typography>
                </Box>
                {/* 解決したボタン（飼い主のみ表示） */}
                {selectedRoom && selectedRoom.ownerId === user?.uid && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setResolveModalOpen(true)}
                    sx={{
                      bgcolor: '#4CAF50',
                      '&:hover': {
                        bgcolor: '#45a049'
                      },
                      fontWeight: 'bold'
                    }}
                  >
                    解決した
                  </Button>
                )}
              </Box>
              
              {/* ペットのステータス情報 */}
              {(petStatus.condition || petStatus.currentLocation) && (
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  px: 1
                }}>
                  {petStatus.condition && (
                    <Chip
                      size="small"
                      icon={<CircleIcon sx={{ fontSize: '12px !important' }} />}
                      label={`状態: ${petStatus.condition}`}
                      sx={{ 
                        bgcolor: petStatus.condition === '良好（元気そう）' ? 'success.main' : 
                                 petStatus.condition === '怪我をしている' ? 'error.main' : 
                                 petStatus.condition === '弱っている' ? 'warning.main' : 
                                 petStatus.condition === '普通' ? 'info.main' : 
                                 petStatus.condition === '不明' ? 'grey.600' : 'grey.600',
                        color: 'white',
                        fontSize: '0.75rem',
                        height: 24,
                        '& .MuiChip-icon': {
                          color: 'white',
                        }
                      }}
                    />
                  )}
                  {petStatus.currentLocation && (
                    <Chip
                      size="small"
                      label={`現在: ${petStatus.currentLocation}`}
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '0.75rem',
                        height: 24
                      }}
                    />
                  )}
                  {petStatus.canKeepTemporarily && (
                    <Chip
                      size="small"
                      label={petStatus.keepUntilDate ? `保護可能: ${petStatus.keepUntilDate}まで` : '一時保護可能'}
                      sx={{ 
                        bgcolor: 'info.main',
                        color: 'white',
                        fontSize: '0.75rem',
                        height: 24
                      }}
                    />
                  )}
                </Box>
              )}
            </Paper>

            {/* メッセージエリア - スクロール可能 */}
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              p: 2,
              bgcolor: '#93AAD4',
              display: 'flex',
              flexDirection: 'column',
              height: 0, // Flexboxでのスクロール制御に必要
              minHeight: 0
            }}>
              {messages.map((message) => {
                const isOwn = message.senderId === user?.uid;
                
                return (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwn ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {!isOwn && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'white',
                            mb: 0.5,
                            ml: 1,
                            fontSize: '0.7rem'
                          }}
                        >
                          {message.senderNickname}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          position: 'relative',
                          bgcolor: isOwn ? '#85DC84' : 'white',
                          borderRadius: '18px',
                          px: 2,
                          py: 1,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          '&::before': isOwn ? {} : {
                            content: '""',
                            position: 'absolute',
                            top: '10px',
                            left: '-7px',
                            width: 0,
                            height: 0,
                            borderStyle: 'solid',
                            borderWidth: '7px 7px 7px 0',
                            borderColor: 'transparent white transparent transparent'
                          },
                          '&::after': isOwn ? {
                            content: '""',
                            position: 'absolute',
                            top: '10px',
                            right: '-7px',
                            width: 0,
                            height: 0,
                            borderStyle: 'solid',
                            borderWidth: '7px 0 7px 7px',
                            borderColor: 'transparent transparent transparent #85DC84'
                          } : {}
                        }}
                      >
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {message.text}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block', 
                            mt: 0.5, 
                            textAlign: 'right',
                            color: isOwn ? 'rgba(0,0,0,0.6)' : 'text.secondary',
                            fontSize: '0.65rem'
                          }}
                        >
                          {message.timestamp && formatTime(message.timestamp)}
                          {isOwn && message.read && (
                            <span style={{ marginLeft: '4px' }}>既読</span>
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            {/* メッセージ入力エリア - 固定 */}
            <Box
              sx={{ 
                p: 2, 
                bgcolor: 'white',
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 1,
                flexShrink: 0
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="メッセージを入力..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
                variant="outlined"
                size="small"
              />
              <IconButton
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                sx={{
                  bgcolor: '#2196f3',
                  color: 'white',
                  '&:hover': { 
                    bgcolor: '#1976d2'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'grey.300',
                    color: 'grey.500'
                  }
                }}
              >
                {sending ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}>
            <PetsIcon sx={{ fontSize: 64, color: 'grey.300' }} />
            <Typography variant="h6" color="text.secondary">
              チャットを選択してください
            </Typography>
            <Typography variant="body2" color="text.secondary">
              左のリストから会話を選んで開始しましょう
            </Typography>
          </Box>
        )}
      </Box>

      {/* 解決確認モーダル */}
      <Dialog open={resolveModalOpen} onClose={() => setResolveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6">ペットの受け取り確認</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ペットを無事に受け取りましたか？
          </Typography>
          <Typography variant="body2" color="text.secondary">
            「はい」を選択すると、この案件は解決済みとしてマークされ、
            ダッシュボードからマッチング情報が削除されます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResolveModalOpen(false)}
            disabled={resolving}
          >
            いいえ
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolveCase}
            disabled={resolving}
            startIcon={resolving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {resolving ? '処理中...' : 'はい、受け取りました'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}