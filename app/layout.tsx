import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '외상노트 — 고객 외상값 관리',
  description: '고객별 외상과 입금을 기록하고 미수금을 한눈에 확인하세요.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
