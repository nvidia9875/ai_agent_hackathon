import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証不要なパス
const publicPaths = ['/login', '/signup', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 公開パスの場合はそのまま通す
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // 認証が必要なページの場合、クライアントサイドでチェック
  // Note: Next.js middlewareではFirebase Authの認証状態を直接確認できないため、
  // クライアントサイドでのチェックが必要
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};