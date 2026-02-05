import type { Metadata } from "next";
import "./globals.css";

// 🔥 여기가 검색엔진에 뜨는 정보입니다.
export const metadata: Metadata = {
  title: "대한민국 국회의원 너 얼마있어? - WatchDog",
  description: "국회의원 재산 순위, 부동산, 자동차, 현금, 부채 분석. 내 지역구 의원의 재산을 확인해보세요.",
  icons: {
    icon: "/favicon.ico", // 파비콘이 있다면
  },
  openGraph: {
    title: "국회의원 너 얼마있어? (WatchDog)",
    description: "느그 서장... 아니 의원님 재산 얼마야? 국회의원 재산 전수 조사 데이터.",
    url: "https://ni-eolma.com",
    siteName: "WatchDog",
    locale: "ko_KR",
    type: "website",
  },
  keywords: ["국회의원 재산", "국회의원 순위", "정치인 재산", "박덕흠", "안철수", "재산공개"],

  verification: {
    google: 'JmFVjC8V6iKzCDm2iXz7nsJMwi0DHxZ2PvA6KUeVF-s',
    other: {
      'naver-site-verification': '네이버에서_준_코드',
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
      <body>{children}</body>
    </html>
  );
}