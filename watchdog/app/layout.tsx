import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import { promises as fs } from 'fs';
import path from 'path';

// 🔥 동적 메타데이터 생성 (키워드 4배 강화)
export async function generateMetadata(): Promise<Metadata> {
  let dynamicKeywords: string[] = [];

  try {
    // 1. public 폴더의 의원 명단 파일 읽기
    const filePath = path.join(process.cwd(), 'public', 'assembly_assets.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const members: { name: string }[] = JSON.parse(fileContents);

    // 2. 의원 1명당 키워드 4개씩 생성 (총 1,200개 내외)
    dynamicKeywords = members.flatMap(m => [
      `${m.name} 재산`,
      `${m.name} 부동산`,
      `${m.name} 재산공개`,
      `${m.name} 아파트`
    ]);

  } catch (e) {
    console.error("키워드 생성 중 에러:", e);
  }

  // 3. 기본 핵심 키워드
  const baseKeywords = [
    "국회의원 재산", "국회의원 재산 순위", "국회의원 연봉", 
    "정치인 재산", "22대 국회의원", "국회의원 부동산", 
    "재산공개", "공직자윤리위원회", "WatchDog"
  ];

  // 4. 최종 메타데이터 반환
  return {
    metadataBase: new URL("https://ni-eolma.com"), 
    title: {
      default: "국회의원 재산 순위 & 분석 - WatchDog (너 얼마있어?)",
      template: "%s | WatchDog",
    },
    description: "2025년 최신 국회의원 재산 순위 공개. 내 지역구 의원의 부동산, 주식, 가상자산, 현금 보유 현황을 확인하세요.",
    
    // ✅ (기본 키워드) + (의원수 x 4)개의 강력한 키워드 조합
    keywords: [...baseKeywords, ...dynamicKeywords],

    icons: {
      icon: "/favicon.ico",
    },
    openGraph: {
      title: "국회의원 재산 1위는 누구? - WatchDog",
      description: "느그 서장... 아니 의원님 재산 얼마야? 국회의원 재산 전수 조사 데이터.",
      url: "https://ni-eolma.com",
      siteName: "WatchDog",
      locale: "ko_KR",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
        },
      ],    
    },
    twitter: {
      card: "summary_large_image",
      title: "WatchDog - 국회의원 재산 감시",
      description: "느그 서장... 아니 의원님 재산 얼마야? 국회의원 재산 전수 조사 데이터.",
      images: ["/og-image.png"],
    },
    verification: {
      google: 'JmFVjC8V6iKzCDm2iXz7nsJMwi0DHxZ2PvA6KUeVF-s',
      other: {
        'naver-site-verification': 'd1fa176ccc0f0a2308546a620e6992e165e208a8',
      },
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // ✅ 2. 구글이 좋아하는 구조화 데이터 (JSON-LD) 정의
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "WatchDog",
    "alternateName": "국회의원 재산 순위 & 분석",
    "url": "https://ni-eolma.com",
    "description": "2025년 최신 국회의원 재산 순위 공개. 내 지역구 의원의 부동산, 주식, 가상자산, 현금 보유 현황을 확인하세요.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ni-eolma.com/?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1019593213463092"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body>
        {/* ✅ JSON-LD 스크립트 삽입 (검색엔진이 읽는 데이터) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {children}
        <Analytics />
      </body>
    </html>
  );
}
