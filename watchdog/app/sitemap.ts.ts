import { MetadataRoute } from 'next';

// 데이터를 가져오는 함수 (실제 데이터 경로에 맞춰 수정 필요할 수 있음)
// 여기서는 하드코딩된 예시나, 외부 fetch를 가정합니다.
// 빌드 타임에 생성되므로, public 폴더의 json을 읽어오는 로직을 넣거나
// 일단은 메인 페이지만 등록해도 됩니다.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ni-eolma.com';

  // 1. 메인 페이지
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
  ];

  // 2. (선택사항) 개별 의원 페이지도 검색되게 하려면 여기서 데이터를 불러와서 map을 돌려야 합니다.
  // 지금은 복잡할 수 있으니 메인 페이지만 확실하게 등록합시다.
  
  return routes;
}
