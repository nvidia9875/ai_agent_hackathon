import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CustomThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { NotificationProvider } from "@/lib/contexts/notification-context";
import { SuccessNotificationProvider } from "@/lib/contexts/success-notification-context";
import ClientHeader from "@/components/ClientHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PawMate - AI迷子ペット捜索システム",
  description: "PawMate（パウメイト）は、3つの自律的AIエージェントが連携して迷子のペットを見つける革新的な捜索支援システムです。画像解析、行動予測、捜索戦略の最適化により、大切な家族との再会をサポートします。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NotificationProvider>
            <SuccessNotificationProvider>
              <CustomThemeProvider>
                <ClientHeader />
                {children}
              </CustomThemeProvider>
            </SuccessNotificationProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
