'use client';

import dynamic from 'next/dynamic';

const Header = dynamic(() => import('./Header'), {
  ssr: false,
  loading: () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  )
});

export default Header;