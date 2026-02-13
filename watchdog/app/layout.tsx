import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import { promises as fs } from 'fs';
import path from 'path';

// ✅ 데이터 타입 정의 (명확한 구분을 위해)
interface AssemblyMember {
  name: string;
  party?: string;        // 정당 (국회의원용)
  constituency?: string; // 지역구 (국회의원용)
}

interface GovMember {
  name: string;
  affiliation: string;   // 소속 (ex: 대통령비서실)
  position?: string;     // 직위 (데이터에 있다면 활용)
}

export async function generateMetadata(): Promise<Metadata> {
  let dynamicKeywords: string[] = [];

  try {
    // 1. 데이터 파일 경로
    const assemblyPath = path.join(process.cwd(), 'public', 'assembly_assets.json');
    const govPath = path.join(process.cwd(), 'public', 'officials_property.json');

    // 2. 병렬로 파일 읽기
    const [assemblyData, govData] = await Promise.all([
      fs.readFile(assemblyPath, 'utf8').catch(() => '[]'),
      fs.readFile(govPath, 'utf8').catch(() => '[]')
    ]);

    const assemblyMembers: AssemblyMember[] = JSON.parse(assemblyData);
    const govMembers: GovMember[] = JSON.parse(govData);

    // 3. 🔥 국회의원용 키워드 생성 (이름 + 정당 + 지역구 조합)
    const assemblyKeywords = assemblyMembers.flatMap(m => {
      const keywords = [
        `${m.name} 재산`,
        `${m.name} 부동산`,
        `${m.name} 재산공개`,
        `${m.name} 아파트`,
        `${m.name} 재산 조회`,
        `${m.name} 재산 공개`,
      ];
      if (m.party) keywords.push(`${m.name} ${m.party}`); // ex: 이재명 더불어민주당
      if (m.constituency) keywords.push(`${m.name} ${m.constituency}`); // ex: 안철수 분당갑
      return keywords;
    });

    // 4. 🔥 정부 공직자용 키워드 생성 (이름 + 소속 + 직위 조합)
    // 동명이인 구분의 핵심 로직입니다.
    const govKeywords = govMembers.flatMap(m => {
      const keywords = [
        `${m.name} 재산`,
        `${m.name} 부동산`,
        `${m.name} 재산공개`,
        `${m.name} 아파트`,
        `${m.name} 재산 조회`,
        `${m.name} 재산 공개`,
        `${m.name} 공직자`,
        `${m.name} 재산`,
        `${m.name} ${m.affiliation}`, // ex: 이장형 대통령비서실
        `${m.affiliation} 재산`       // ex: 대통령비서실 재산
      ];
      // 만약 JSON에 position(직위) 필드가 있다면 추가
      if (m.position) keywords.push(`${m.name} ${m.position}`);
      return keywords;
    });

    // 5. 키워드 합치기 (중복 제거는 검색엔진이 알아서 하지만, 너무 많으면 자름)
    // 상위 2000개 정도까지만 유효하므로 중요한 순서대로 배치
    dynamicKeywords = [...assemblyKeywords, ...govKeywords];

  } catch (e) {
    console.error("키워드 생성 중 에러:", e);
  }

  // 6. 기본 핵심 키워드 (검색량이 많은 메인 키워드)
  const baseKeywords = [
    // 국회의원 쪽
    "국회의원 재산 순위", "국회의원 연봉", "22대 국회의원 명단",
    // 정부 공직자 쪽
    "고위공직자 재산 공개", "대통령실 비서관 재산", "장관 재산 순위", "공직자윤리위원회",
    // 공통/브랜드
    "WatchDog", "니얼마", "재산 조회", "공직자 재산 검색"
  ];

  return {
    metadataBase: new URL("https://ni-eolma.com"), 
    title: {
      default: "국회의원 & 고위공직자 재산 순위 - WatchDog",
      template: "%s | WatchDog",
    },
    description: "국회의원(정당, 지역구) 및 정부 고위공직자(대통령실, 장차관)의 재산 전수 조사. 부동산, 주식, 가상자산 보유 현황을 소속별로 확인하세요.",
    
    // ✅ (기본 키워드) + (동적 생성된 정교한 키워드)
    keywords: [...baseKeywords, ...dynamicKeywords],

    icons: {
      icon: "/favicon.ico",
    },
    openGraph: {
      title: "국회의원 & 공직자 재산 1위는 누구?",
      description: "느그 서장... 아니 의원님 재산 얼마야? 국회의원 및 고위공직자 재산 전수 조사 데이터.",
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
      title: "WatchDog - 공직자 재산 감시",
      description: "국회의원 및 고위공직자 재산 전수 조사 데이터.",
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
  
  // ✅ JSON-LD 구조화 데이터 (검색엔진에 사이트 성격 명시)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "WatchDog",
    "alternateName": "국회의원 및 고위공직자 재산 분석",
    "url": "https://ni-eolma.com",
    "description": "국회의원 및 정부 고위공직자 재산 순위 공개. 소속, 직위, 정당별 재산 검색 기능 제공.",
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
