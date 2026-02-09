import { MetadataRoute } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ni-eolma.com';

  // 1. 고정 페이지 (메인 페이지)
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    // 개인정보처리방침 페이지가 있다면 추가 (없으면 이 부분 지우셔도 됩니다)
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  // 2. 동적 페이지 (의원별 상세 페이지 자동 생성)
  let memberRoutes: MetadataRoute.Sitemap = [];

  try {
    // public 폴더에 있는 JSON 파일을 서버에서 읽어옵니다.
    const filePath = path.join(process.cwd(), 'public', 'assembly_assets.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    // JSON 파싱 (타입은 name만 있으면 됩니다)
    const members: { name: string }[] = JSON.parse(fileContents);

    // 의원 수만큼 URL 생성 (예: .../member/이재명)
    memberRoutes = members.map((member) => ({
      url: `${baseUrl}/member/${member.name}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const, // 재산 정보는 매일 바뀌진 않으므로 weekly
      priority: 0.8, // 메인보다는 낮지만 꽤 중요함
    }));

  } catch (error) {
    console.error('사이트맵 생성 중 파일 읽기 실패:', error);
    // 에러가 나더라도 메인 페이지는 반환해야 함
  }

  // 고정 페이지와 의원 페이지를 합쳐서 반환
  return [...staticRoutes, ...memberRoutes];
}
