// 국회의원 가상 데이터 (나중에는 엑셀이나 DB에서 가져올 부분입니다)
export const members = [
  {
    id: 1,
    name: "안철수",
    party: "국민의힘",
    district: "경기 성남시분당구갑",
    assets: "1,401억",
    change: "+4.5%",
    status: "up", // 재산 증가
  },
  {
    id: 2,
    name: "박덕흠",
    party: "국민의힘",
    district: "충북 보은군옥천군영동군괴산군",
    assets: "562억",
    change: "-1.2%",
    status: "down", // 재산 감소
  },
  {
    id: 3,
    name: "박정",
    party: "더불어민주당",
    district: "경기 파주시을",
    assets: "477억",
    change: "+12.8%",
    status: "up",
  },
  {
    id: 4,
    name: "전봉민",
    party: "국민의힘",
    district: "부산 수영구",
    assets: "359억",
    change: "0.0%",
    status: "same",
  },
];