import type { Metadata } from "next";
import "./globals.css";

// 🔥 여기가 검색엔진에 뜨는 정보입니다.
export const metadata: Metadata = {
  // 1. 기본 사이트 주소 (이미지 경로를 찾기 위해 필요)
  metadataBase: new URL("https://ni-eolma.com"), 

  title: "대한민국 국회의원 너 얼마있어? - WatchDog",
  description: "국회의원 재산 순위, 부동산, 자동차, 현금, 부채 분석. 내 지역구 의원의 재산을 확인해보세요.",
  icons: {
    icon: "/favicon.ico", // 파비콘이 있다면
  },
  openGraph: {
    title: "국회의원 너 얼마있어? (WatchDog)",
    description: "느그 서장... 아니 의원님 재산 얼마야? 국회의원 재산 전수 조사 데이터.",
    url: "https://ni-eolma.com",
    images: [
      {
        url: "/og-image.png", // public 폴더에 넣은 이미지 이름
        width: 1200,
        height: 630,
      },
    ],    
    siteName: "WatchDog",
    locale: "ko_KR",
    type: "website",
  },

  // 3. 트위터/X용 설정 (선택사항이지만 추천)
  twitter: {
    card: "summary_large_image",
    title: "WatchDog - 국회의원 재산 감시",
    description: "느그 서장... 아니 의원님 재산 얼마야? 국회의원 재산 전수 조사 데이터.",
    images: ["/og-image.png"],
  },

  keywords: ["국회의원 재산", "국회의원 순위", "정치인 재산", "박덕흠", "안철수", "재산공개"],

  verification: {
    google: 'JmFVjC8V6iKzCDm2iXz7nsJMwi0DHxZ2PvA6KUeVF-s',
    other: {
      'naver-site-verification': 'd1fa176ccc0f0a2308546a620e6992e165e208a8',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/* 👇 head 태그를 직접 열고, 쌩 HTML script 태그를 넣습니다 */}
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1019593213463092"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body>{children}</body>
    </html>
  );
}