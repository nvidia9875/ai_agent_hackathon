'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/auth-context';
import { useNotifications } from '@/lib/contexts/notification-context';


export default function Header() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const { user, loading, logout } = useAuth();
  const { unreadCount, chatNotifications, markAsRead } = useNotifications();


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

  
  const handleLogout = async () => {
    try {
      await logout();
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
            <Image 
              src="/sitelogo.svg" 
              alt="PawMate Logo" 
              width={32} 
              height={32}
              className="text-blue-600"
            />
            <span className="font-bold text-xl text-gray-900">PawMate</span>
          </Link>

          {/* 右側のコントロール */}
          <div className="flex items-center space-x-3">

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