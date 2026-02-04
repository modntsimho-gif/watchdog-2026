import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WatchDog - 대한민국 국회의원 재산 지도",
  description: "국회의원들의 실제 순자산과 재산 변동 내역을 한눈에 확인하세요.",
  openGraph: {
    title: "WatchDog - 대한민국 국회의원 재산 지도",
    description: "우리 지역구 의원의 재산은 얼마일까요? 빚 제외 순자산 공개.",
    // 썸네일 이미지가 있다면 public 폴더에 넣고 아래 주석을 푸세요
    // images: ['/thumbnail.png'], 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}