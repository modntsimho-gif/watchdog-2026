import { MetadataRoute } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ni-eolma.com';

  // 1. 고정 페이지 (메인, 개인정보처리방침 등)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // 필요하다면 추가
    // { url: `${baseUrl}/privacy`, lastModified: new Date(), ... },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // 2. 파일 경로 설정 (public 폴더 내)
    // ⚠️ 파일명이 실제 프로젝트와 일치하는지 꼭 확인하세요!
    const assemblyPath = path.join(process.cwd(), 'public', 'assembly_assets.json');
    const govPath = path.join(process.cwd(), 'public', 'officials_property.json'); 

    // 3. 병렬로 파일 읽기 (속도 최적화)
    const [assemblyData, govData] = await Promise.all([
      fs.readFile(assemblyPath, 'utf8').catch(() => '[]'), // 파일 없으면 빈 배열 처리
      fs.readFile(govPath, 'utf8').catch(() => '[]')
    ]);

    // 4. 데이터 파싱
    const assemblyMembers: { name: string }[] = JSON.parse(assemblyData);
    const rawGov = JSON.parse(govData);
    // 공직자 데이터 구조가 배열인지 객체인지 확인 (안전장치)
    const govMembers: { name: string }[] = Array.isArray(rawGov) ? rawGov : (rawGov.officials || []);

    // 5. 국회의원 URL 생성 (?type=assembly)
    const assemblyRoutes = assemblyMembers.map((member) => ({
      // 한글 이름은 URL 인코딩 하는 것이 표준 (ex: %ED%99%8D...)
      url: `${baseUrl}/member/${encodeURIComponent(member.name)}?type=assembly`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 6. 공직자 URL 생성 (?type=government)
    const govRoutes = govMembers.map((member) => ({
      url: `${baseUrl}/member/${encodeURIComponent(member.name)}?type=government`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 두 리스트 합치기
    dynamicRoutes = [...assemblyRoutes, ...govRoutes];

  } catch (error) {
    console.error('사이트맵 생성 중 에러 발생:', error);
  }

  // 7. 최종 반환 (고정 + 동적)
  return [...staticRoutes, ...dynamicRoutes];
}
