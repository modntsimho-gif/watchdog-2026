// app/member/[name]/page.tsx
import { Metadata } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import MemberDetailClient from './MemberDetailClient'; // 👈 분리한 클라이언트 컴포넌트 불러오기

// 1. Props 타입 정의
type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 2. 데이터 타입 정의 (메타데이터 생성용)
interface Asset {
  current_value: number;
}

interface MemberData {
  name: string;
  affiliation?: string;  // 공직자용
  party?: string;        // 국회의원용
  constituency?: string; // 국회의원용
  assets: Asset[];
}

// 🔥 3. 동적 메타데이터 생성 (서버 사이드 실행)
export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  // Promise 언랩핑 (Next.js 15+ 대응)
  const { name: rawName } = await params;
  const { type } = await searchParams;
  
  const name = decodeURIComponent(rawName);
  const viewType = type as string; // 'assembly' or 'government'

  let title = "";
  let description = "";
  let keywords: string[] = [];

  try {
    // 파일 읽기
    const fileName = viewType === 'government' ? 'officials_property.json' : 'assembly_assets.json';
    const filePath = path.join(process.cwd(), 'public', fileName);
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    let member: MemberData | undefined;

    // 데이터 파싱 및 타겟 찾기
    if (viewType === 'government') {
        const json = JSON.parse(fileContents);
        // officials_property.json 구조가 { officials: [...] } 인지 배열인지 확인 필요
        const data = Array.isArray(json) ? json : json.officials || [];
        member = data.find((m: any) => m.name === name);
    } else {
        const data = JSON.parse(fileContents);
        member = data.find((m: any) => m.name === name);
    }

    if (member) {
      // 총 자산 계산 (썸네일 클릭 유도용)
      const totalAsset = member.assets.reduce((acc, cur) => acc + cur.current_value, 0);
      const formattedAsset = (totalAsset / 10000).toFixed(1) + "억"; // 예: 15.4억

      if (viewType === 'government') {
        // 🏛️ 공직자 메타데이터
        const affiliation = member.affiliation || "소속 미상";
        title = `${name} (${affiliation}) 재산 내역 - WatchDog`;
        description = `${affiliation} 소속 ${name} 공직자의 재산 신고액은 약 ${formattedAsset}원 입니다. 부동산, 주식, 가상자산 상세 내역을 확인하세요.`;
        keywords = [name, affiliation, `${name} 재산`, "공직자 재산", "고위공직자", "WatchDog", "재산공개"];
      
      } else {
        // 🏛️ 국회의원 메타데이터
        const party = member.party || "무소속";
        const constituency = member.constituency || "";
        const info = constituency ? `${party} · ${constituency}` : party;
        
        title = `${name} 의원 (${info}) 재산 내역 - WatchDog`;
        description = `제22대 국회의원 ${name}(${party})의 재산 총액은 약 ${formattedAsset}원 입니다. 아파트, 코인, 주식 보유 현황을 분석합니다.`;
        keywords = [name, party, constituency, `${name} 재산`, "국회의원 재산", "WatchDog", "재산순위"];
      }
    } else {
      // 데이터 없음 fallback
      title = `${name} 재산 정보 - WatchDog`;
      description = `${name} 님의 재산 정보를 조회합니다.`;
    }

  } catch (error) {
    console.error("Metadata Error:", error);
    title = "WatchDog - 인물 재산 정보";
    description = "대한민국 공직자 및 국회의원 재산 정보 조회 서비스";
  }

  return {
    title: title,
    description: description,
    keywords: keywords,
    openGraph: {
      title: title,
      description: description,
      url: `https://www.ni-eolma.com/member/${rawName}?type=${viewType}`,
      siteName: "WatchDog",
      images: [
        {
          url: "/og-image.png", // public 폴더에 대표 이미지 넣어두세요
          width: 1200,
          height: 630,
        },
      ],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `https://www.ni-eolma.com/member/${rawName}?type=${viewType}`,
    },
  };
}

// 4. 실제 페이지 렌더링 (클라이언트 컴포넌트 호출)
export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  // params를 그대로 클라이언트 컴포넌트에 넘겨줍니다.
  return <MemberDetailClient params={params} />;
}
