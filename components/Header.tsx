'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { useNotifications } from '@/lib/contexts/notification-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

interface AgentStatus {
  name: string;
  status: 'idle' | 'processing' | 'error' | 'success';
  description?: string;
  lastActivity?: Date;
}

export default function Header() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [activeAgents, setActiveAgents] = useState<AgentStatus[]>([]);
  const [analyzedImages, setAnalyzedImages] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const { unreadCount, chatNotifications, markAsRead } = useNotifications();

  // エージェントステータスを定期的に取得
  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const response = await fetch('/api/agents/status');
        if (response.ok) {
          const data = await response.json();
          
          // アクティブなエージェントのみフィルタ
          const active = data.agents?.filter((agent: AgentStatus) => 
            agent.status === 'processing' || agent.status === 'success'
          ) || [];
          
          setActiveAgents(active);
          setAnalyzedImages(data.analyzedImages || 0);
          setTotalProgress(data.totalProgress || 0);
        }
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
      }
    };

    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  // ドロップダウン外をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    };

    if (showDropdown || showUserMenu || showNotificationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showUserMenu, showNotificationMenu]);

  // ステータスアイコンの色を取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500 animate-pulse';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // 総合ステータスを計算
  const getOverallStatus = () => {
    if (activeAgents.some(a => a.status === 'error')) return 'error';
    if (activeAgents.some(a => a.status === 'processing')) return 'processing';
    if (activeAgents.some(a => a.status === 'success')) return 'success';
    return 'idle';
  };

  const overallStatus = getOverallStatus();
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200"
    >
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-14">
          {/* ロゴ・サイト名 */}
          <Link href="/" className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2M7 4C7 5.1 6.1 6 5 6C3.9 6 3 5.1 3 4C3 2.9 3.9 2 5 2C6.1 2 7 2.9 7 4M19 2C17.9 2 17 2.9 17 4C17 5.1 17.9 6 19 6C20.1 6 21 5.1 21 4C21 2.9 20.1 2 19 2M12 7C10.3 7 9 8.3 9 10C9 12 12 15.8 12 15.8S15 12 15 10C15 8.3 13.7 7 12 7M5.5 8C3.6 8 2 9.6 2 11.5C2 13 4.5 16.5 4.5 16.5S7 13 7 11.5C7 9.6 5.4 8 3.5 8H5.5M19.5 8H17.5C19.4 8 21 9.6 21 11.5C21 13 18.5 16.5 18.5 16.5S16 13 16 11.5C16 9.6 17.6 8 19.5 8M12 17C9 17 2 19 2 22H22C22 19 15 17 12 17Z"/>
            </svg>
            <span className="font-bold text-xl text-gray-900">PawMate</span>
          </Link>

          {/* 右側のコントロール */}
          <div className="flex items-center space-x-3">
            {/* AIエージェントステータス */}
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* ステータスインジケーター */}
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(overallStatus)}`} />
                {overallStatus === 'processing' && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                )}
              </div>
              
              {/* ステータステキスト */}
              <span className="text-sm text-gray-700">
                {activeAgents.length > 0 
                  ? `${activeAgents.length}個のエージェント稼働中`
                  : 'エージェント待機中'
                }
              </span>

              {/* ドロップダウンアイコン */}
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* エージェント ドロップダウンメニュー */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
                  <h3 className="font-semibold">AIエージェント詳細</h3>
                  <p className="text-xs text-blue-100 mt-1">リアルタイム処理状況</p>
                </div>

                {/* 統計情報 */}
                <div className="grid grid-cols-3 gap-2 p-4 border-b border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analyzedImages}</div>
                    <div className="text-xs text-gray-500">解析済み画像</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{activeAgents.length}</div>
                    <div className="text-xs text-gray-500">アクティブ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{totalProgress}%</div>
                    <div className="text-xs text-gray-500">進捗率</div>
                  </div>
                </div>

                {/* エージェントリスト */}
                <div className="max-h-64 overflow-y-auto">
                  {activeAgents.length > 0 ? (
                    <div className="p-4 space-y-3">
                      {activeAgents.map((agent, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${getStatusColor(agent.status)}`} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                            {agent.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{agent.description}</div>
                            )}
                            {agent.lastActivity && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(agent.lastActivity).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M20 12H4M12 4v16" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">現在稼働中のエージェントはありません</p>
                      <p className="text-xs text-gray-400 mt-1">タスクが開始されると表示されます</p>
                    </div>
                  )}
                </div>

                {/* フッター */}
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    詳細を見る →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 通知アイコン */}
          {user && (
            <div className="relative" ref={notificationMenuRef}>
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg 
                  className="w-6 h-6 text-gray-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 17h5l-3.5 3.5M9 17h5l-3.5 3.5M12 3a7 7 0 017 7v4.29l1.71 1.7a1 1 0 01-.71 1.71H6a1 1 0 01-.71-1.71L7 14.29V10a7 7 0 017-7z" 
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* 通知ドロップダウンメニュー */}
              {showNotificationMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
                    <h3 className="font-semibold">通知</h3>
                    <p className="text-xs text-red-100 mt-1">新しいチャットメッセージ</p>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {chatNotifications.length > 0 ? (
                      <div className="p-4 space-y-3">
                        {chatNotifications.map((notification, index) => (
                          <div key={notification.roomId} 
                               className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded" 
                               onClick={() => {
                                 setShowNotificationMenu(false);
                                 window.location.href = `/chat?roomId=${notification.roomId}`;
                               }}>
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{notification.senderName}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {notification.petName}について
                              </div>
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {notification.lastMessage}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-xs text-gray-400">
                                  {notification.timestamp && new Date(notification.timestamp.toDate()).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {notification.unreadCount > 1 && (
                                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                    {notification.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M15 17h5l-3.5 3.5M9 17h5l-3.5 3.5M12 3a7 7 0 017 7v4.29l1.71 1.7a1 1 0 01-.71 1.71H6a1 1 0 01-.71-1.71L7 14.29V10a7 7 0 017-7z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500">新しい通知はありません</p>
                        <p className="text-xs text-gray-400 mt-1">新しいメッセージが届くとここに表示されます</p>
                      </div>
                    )}
                  </div>
                  
                  {unreadCount > 0 && (
                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                      <button
                        onClick={() => {
                          markAsRead();
                          setShowNotificationMenu(false);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        すべて既読にする
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ユーザーアカウントメニュー */}
          <div className="relative" ref={userMenuRef}>
            {loading ? (
              // ローディング中はスケルトンを表示
              <div className="flex items-center space-x-2 px-3 py-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : user ? (
              <>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 max-w-[150px] truncate">
                    {user.email}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ユーザーメニュー ドロップダウン */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">アカウント</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // ログインしていない場合は何も表示しない（もしくは最小限の表示）
              <div className="w-32 h-10" />
            )}
          </div>
        </div>
      </div>
    </div>
  </header>
  );
}