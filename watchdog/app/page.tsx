"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script"; // 🔥 애드센스용 스크립트 컴포넌트 추가

// 1. 재산 데이터 구조
interface RawAssetItem {
  type: string;
  description: string;
  previous_value: number;
  current_value: number;
}

interface RawAssetMember {
  name: string;
  assets: RawAssetItem[];
}

// 2. 인물 정보 데이터 구조
interface RawProfile {
  NAAS_NM: string;       
  PLPT_NM: string;       
  ELECD_NM: string;      
  NAAS_PIC: string;      
  STATUS_NM: string;     
}

// 3. 화면 구조 (카테고리별 자산 추가)
interface Member {
  id: string;
  name: string;
  party: string;
  district: string;
  imageUrl: string;
  
  totalAssets: number; // 순자산 (자산 - 부채)
  realEstate: number;  // 부동산 (토지 + 건물)
  cars: number;        // 자동차
  financial: number;   // 현금성 (예금 + 증권 + 현금)
  debt: number;        // 부채 (절대값)

  changeAmount: number;
  changeRate: number;
}

// 탭 타입 정의
type TabType = "total" | "realEstate" | "cars" | "financial" | "debt";

// 캐싱 변수
let cachedMembers: Member[] | null = null;

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🔥 현재 선택된 랭킹 탭 (기본값: 순자산)
  const [activeTab, setActiveTab] = useState<TabType>("total");

  useEffect(() => {
    if (cachedMembers) {
      setMembers(cachedMembers);
      setLoading(false);
      setTimeout(() => {}, 0);
      return;
    }

    async function fetchData() {
      try {
        const [assetsRes, profilesRes] = await Promise.all([
          fetch("/assembly_assets.json"),
          fetch("/members_info.json"),
        ]);

        if (!assetsRes.ok || !profilesRes.ok) throw new Error("파일 로딩 실패");

        const rawAssets: RawAssetMember[] = await assetsRes.json();
        const rawProfiles: RawProfile[] = await profilesRes.json();

        const profileMap = new Map<string, RawProfile>();
        rawProfiles.forEach((p) => {
          if (p.STATUS_NM === "현직의원") {
             profileMap.set(p.NAAS_NM, p);
          }
        });

        const processed = rawAssets.map((person, index) => {
          let realEstate = 0;
          let cars = 0;
          let financial = 0;
          let debt = 0;
          let totalAssets = 0; // 순자산

          let prevTotal = 0;

          person.assets.forEach((item) => {
            const t = item.type;
            const d = item.description;
            const val = item.current_value;
            const prev = item.previous_value;

            // 1. 부채 판별 (가장 먼저 체크)
            if (t.includes("채무") || d.includes("채무")) {
              debt += val; // 부채는 양수로 누적 (나중에 뺄셈)
              totalAssets -= val;
              prevTotal -= prev;
            } 
            // 2. 부동산 (건물, 토지)
            else if (t.includes("건물") || t.includes("토지") || t.includes("부동산")) {
              realEstate += val;
              totalAssets += val;
              prevTotal += prev;
            }
            // 3. 자동차
            else if (t.includes("자동차") || t.includes("차량") || t.includes("승용차")) {
              cars += val;
              totalAssets += val;
              prevTotal += prev;
            }
            // 4. 현금성 (예금, 증권, 현금, 채권)
            else if (t.includes("예금") || t.includes("증권") || t.includes("현금") || t.includes("채권")) {
              financial += val;
              totalAssets += val;
              prevTotal += prev;
            }
            // 5. 기타 자산 (골동품, 회원권 등)
            else {
              totalAssets += val;
              prevTotal += prev;
            }
          });
          
          const changeAmount = totalAssets - prevTotal;
          const changeRate = prevTotal === 0 ? 0 : (changeAmount / prevTotal) * 100;

          const profile = profileMap.get(person.name);
          
          return {
            id: `member-${index}`,
            name: person.name,
            party: profile?.PLPT_NM?.split("/").pop()?.trim() || "무소속",
            district: profile?.ELECD_NM?.split("/").pop()?.trim() || "정보없음",
            imageUrl: profile?.NAAS_PIC || "",
            
            totalAssets,
            realEstate,
            cars,
            financial,
            debt,

            changeAmount,
            changeRate,
          };
        });

        // 초기 정렬: 순자산 순
        processed.sort((a, b) => b.totalAssets - a.totalAssets);
        
        cachedMembers = processed;
        setMembers(processed);
        setLoading(false);
      } catch (error) {
        console.error("에러:", error);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatMoney = (amount: number) => {
    const realAmount = amount * 1000; 
    if (realAmount === 0) return "0원";
    const uk = Math.floor(realAmount / 100000000);
    const rest = realAmount % 100000000;
    const man = Math.floor(rest / 10000);
    
    const sign = realAmount < 0 ? "-" : "";
    const absUk = Math.abs(uk);
    const absMan = Math.abs(man);

    if (absUk > 0) return `${sign}${absUk}억 ${absMan > 0 ? absMan + "만" : ""}원`;
    return `${sign}${absMan}만원`;
  };

  // 탭 변경 시 정렬 로직
  const getSortedMembers = () => {
    let sorted = [...members];
    if (activeTab === "total") sorted.sort((a, b) => b.totalAssets - a.totalAssets);
    else if (activeTab === "realEstate") sorted.sort((a, b) => b.realEstate - a.realEstate);
    else if (activeTab === "cars") sorted.sort((a, b) => b.cars - a.cars);
    else if (activeTab === "financial") sorted.sort((a, b) => b.financial - a.financial);
    else if (activeTab === "debt") sorted.sort((a, b) => b.debt - a.debt); // 빚은 많은 순서대로
    return sorted;
  };

  const sortedMembers = getSortedMembers();

  const filteredMembers = sortedMembers.filter((member) =>
    member.name.includes(searchTerm) || 
    member.party.includes(searchTerm) ||
    member.district.includes(searchTerm)
  );

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  // 탭 버튼 스타일 헬퍼
  const getTabStyle = (tab: TabType) => {
    const base = "px-4 py-2 rounded-full text-sm font-bold transition-all border ";
    if (activeTab === tab) {
      return base + "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105";
    }
    return base + "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700";
  };

  // 현재 탭에 따라 보여줄 금액과 라벨 계산
  const getDisplayValue = (member: Member) => {
    switch (activeTab) {
      case "realEstate": return { label: "부동산 자산", value: member.realEstate, icon: "🏢" };
      case "cars": return { label: "자동차 자산", value: member.cars, icon: "🚗" };
      case "financial": return { label: "현금성 자산", value: member.financial, icon: "💵" };
      case "debt": return { label: "총 부채", value: -member.debt, icon: "💸" }; // 부채는 마이너스로 표시
      default: return { label: "순자산 (빚 제외)", value: member.totalAssets, icon: "💰" };
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center relative">
      
      {/* 🔥 1. 애드센스 스크립트 (Next.js 최적화 방식) */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1019593213463092"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      {/* 2. 상단 타이틀 */}
      <div className="w-full bg-slate-50 pt-16 pb-8 px-4 flex flex-col items-center justify-center border-b border-slate-200">
        <p className="font-mono text-sm mb-4 text-slate-500">
          🕵️‍♀️ 국회의원 재산 감시 프로젝트 <span className="font-bold text-slate-800">WatchDog</span>
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center text-slate-900 mb-4">
          대한민국 국회의원 
        </h2>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center text-slate-900 mb-4">
          <span className="text-blue-600">너 얼마있어?</span>
        </h1>
      </div>

      {/* 3. 탭 & 검색창 (Sticky) */}
      <div className="sticky top-0 z-50 w-full bg-slate-50/90 backdrop-blur-md border-b border-slate-200 py-4 px-4 flex flex-col items-center shadow-sm gap-4">
        
        {/* 검색창 */}
        <div className="w-full max-w-lg relative">
          <div className="absolute left-3 top-3 text-xl">🔍</div>
          <input 
            type="text" 
            placeholder="이름, 정당, 지역구 검색" 
            className="flex h-12 w-full rounded-full border border-slate-300 bg-white px-3 py-2 pl-10 text-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 랭킹 탭 */}
        <div className="flex gap-2 overflow-x-auto w-full max-w-2xl justify-start sm:justify-center pb-2 sm:pb-0 scrollbar-hide">
          <button onClick={() => setActiveTab("total")} className={getTabStyle("total")}>순자산 💰</button>
          <button onClick={() => setActiveTab("realEstate")} className={getTabStyle("realEstate")}>부동산 🏢</button>
          <button onClick={() => setActiveTab("cars")} className={getTabStyle("cars")}>자동차 🚗</button>
          <button onClick={() => setActiveTab("financial")} className={getTabStyle("financial")}>현금부자 💵</button>
          <button onClick={() => setActiveTab("debt")} className={getTabStyle("debt")}>빚쟁이 📉</button>
        </div>
      </div>

      {/* 4. 결과 리스트 */}
      <div className="w-full max-w-6xl p-4 sm:p-10 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            📊 {activeTab === "total" ? "전체 랭킹" : 
                activeTab === "realEstate" ? "부동산 부자 순위" :
                activeTab === "cars" ? "슈퍼카 순위" :
                activeTab === "financial" ? "현금왕 순위" : "빚쟁이 순위"} 
            <span className="text-slate-400 text-lg font-normal ml-2">(Top {filteredMembers.length})</span>
          </h2>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl animate-spin mb-4">⏳</div>
            <p className="text-slate-500">데이터를 분석하고 있습니다...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => {
              const display = getDisplayValue(member);
              return (
                <Link href={`/member/${member.name}`} key={member.id} scroll={true}>
                  <div className="rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer group h-full">
                    {/* 상단 띠 */}
                    <div className={`h-2 w-full ${
                      member.party.includes("국민의힘") ? 'bg-red-600' : 
                      member.party.includes("민주당") ? 'bg-blue-600' : 
                      member.party.includes("조국") ? 'bg-blue-800' : 
                      member.party.includes("개혁") ? 'bg-orange-500' : 'bg-slate-500'
                    }`} />
                    
                    {/* 프로필 */}
                    <div className="flex flex-col p-6 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 flex-shrink-0">
                            {member.imageUrl ? (
                              <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 leading-none tracking-tight">
                              <span className="text-slate-500 text-sm font-normal bg-slate-100 px-2 py-0.5 rounded-md">
                                {index + 1}위
                              </span>
                              {member.name}
                            </h3>
                            <p className="text-sm font-semibold text-slate-600 mt-2">{member.party}</p>
                            <p className="text-xs text-slate-400">{member.district}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 재산 정보 (동적 변경) */}
                    <div className="p-6 pt-2">
                      <div className={`mt-2 p-3 rounded-lg ${activeTab === 'debt' ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className={`text-xs mb-1 ${activeTab === 'debt' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                          {display.label}
                        </p>
                        <div className={`text-2xl font-bold flex items-center gap-2 ${activeTab === 'debt' ? 'text-red-600' : 'text-slate-800'}`}>
                          <span>{display.icon}</span>
                          {formatMoney(display.value)}
                        </div>
                      </div>
                      
                      {/* 순자산 탭일 때만 증감 표시 */}
                      {activeTab === "total" && (
                        <div className="mt-4 flex justify-between text-sm items-center">
                          <span className="text-slate-500">지난 해 대비</span>
                          <div className={`flex items-center font-bold ${member.changeAmount >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                            {member.changeAmount >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(member.changeAmount))}
                            <span className="text-xs font-normal ml-1 text-slate-400">
                              ({member.changeRate.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* 다른 탭일 때는 전체 순자산 참고용 표시 */}
                      {activeTab !== "total" && (
                        <div className="mt-4 flex justify-between text-sm items-center border-t pt-3 border-slate-100">
                          <span className="text-slate-400">전체 순자산</span>
                          <span className="text-slate-600 font-medium">{formatMoney(member.totalAssets)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-slate-400">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 플로팅 버튼 */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <button onClick={scrollToTop} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600">⬆️</button>
        <button onClick={scrollToBottom} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600">⬇️</button>
      </div>

      {/* 🔥 5. 푸터 (Footer) - 데이터 출처 및 개인정보처리방침 */}
      <footer className="w-full bg-slate-900 text-slate-400 py-12 px-4 mt-auto">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          {/* 사이트 소개 및 데이터 출처 */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">WatchDog : 대한민국 국회의원 재산 감시</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              본 서비스는 대한민국 국회 공직자윤리위원회가 공개한 <br className="hidden sm:block" />
              <span className="text-slate-300">공직자 재산등록사항 공개 목록(공보)</span>을 기반으로 제작되었습니다.
            </p>
            <p className="text-xs text-slate-500 pt-2">
              모든 데이터는 공공데이터포털 및 국회 공식 자료를 참조하였으며, 정보의 투명성을 위해 제공됩니다.<br/>
              데이터 처리 과정에서 일부 오차가 발생할 수 있으며, 법적 효력을 갖지 않습니다.
            </p>
          </div>

          {/* 링크 모음 */}
          <div className="pt-6 border-t border-slate-800 flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white transition-colors underline">
              개인정보처리방침
            </Link>
            <a href="mailto:contact@ni-eolma.com" className="hover:text-white transition-colors">
              문의하기
            </a>
          </div>

          <p className="text-slate-500 text-sm mb-2">
          정정 요청 및 건의사항은 하단 메일로 보내주세요.
          </p>
          <a 
          href="mailto:modntsimho@gmail.com" 
          className="text-blue-600 font-bold hover:underline text-lg"
          >
          modntsimho@gmail.com
        </a>

          <p className="text-xs text-slate-600">
            © 2026 WatchDog. All rights reserved.
          </p>
        </div>
      </footer>


    </main>
  );
}
