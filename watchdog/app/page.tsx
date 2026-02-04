"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 1. 재산 데이터 구조
interface RawAssetItem {
  type: string;
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

// 3. 화면 구조
interface Member {
  id: string;
  name: string;
  party: string;
  district: string;
  imageUrl: string;
  totalAssets: number;
  changeAmount: number;
  changeRate: number;
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [assetsRes, profilesRes] = await Promise.all([
          fetch("/assembly_assets.json"),
          fetch("/members_info.json"),
        ]);

        if (!assetsRes.ok || !profilesRes.ok) {
          throw new Error("파일 로딩 실패");
        }

        const rawAssets: RawAssetMember[] = await assetsRes.json();
        const rawProfiles: RawProfile[] = await profilesRes.json();

        const profileMap = new Map<string, RawProfile>();
        rawProfiles.forEach((p) => {
          if (p.STATUS_NM === "현직의원") {
             profileMap.set(p.NAAS_NM, p);
          }
        });

        const processed = rawAssets.map((person, index) => {
          const currentTotal = person.assets.reduce((sum, item) => {
            return item.type.includes("채무") ? sum - item.current_value : sum + item.current_value;
          }, 0);

          const previousTotal = person.assets.reduce((sum, item) => {
            return item.type.includes("채무") ? sum - item.previous_value : sum + item.previous_value;
          }, 0);
          
          const changeAmount = currentTotal - previousTotal;
          const changeRate = previousTotal === 0 ? 0 : (changeAmount / previousTotal) * 100;

          const profile = profileMap.get(person.name);
          
          const cleanParty = profile?.PLPT_NM 
            ? profile.PLPT_NM.split("/").pop()?.trim() 
            : "무소속";

          const cleanDistrict = profile?.ELECD_NM 
            ? profile.ELECD_NM.split("/").pop()?.trim() 
            : "비례/정보없음";

          return {
            id: `member-${index}`,
            name: person.name,
            party: cleanParty || "무소속", 
            district: cleanDistrict || "정보없음",
            imageUrl: profile?.NAAS_PIC || "",
            totalAssets: currentTotal,
            changeAmount: changeAmount,
            changeRate: changeRate,
          };
        });

        processed.sort((a, b) => b.totalAssets - a.totalAssets);
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

  const filteredMembers = members.filter((member) =>
    member.name.includes(searchTerm) || 
    member.party.includes(searchTerm) ||
    member.district.includes(searchTerm)
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center relative">
      
      {/* 1. 상단 타이틀 영역 */}
      <div className="w-full bg-slate-50 pt-16 pb-10 px-4 flex flex-col items-center justify-center border-b border-slate-200">
        <p className="font-mono text-sm mb-4 text-slate-500">
          🕵️‍♀️ 국회의원 재산 감시 프로젝트 <span className="font-bold text-slate-800">WatchDog</span>
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center text-slate-900 mb-4">
          대한민국 국회의원 <span className="text-blue-600">재산 지도</span>
        </h1>
        <p className="text-slate-500 text-center max-w-2xl">
          공직자 윤리위원회 데이터와 국회 정보를 결합하여<br className="sm:hidden"/> 실제 순자산(빚 제외)을 분석했습니다.
        </p>
      </div>

      {/* 2. 검색창 영역 (Sticky) */}
      <div className="sticky top-0 z-50 w-full bg-slate-50/80 backdrop-blur-md border-b border-slate-200 py-4 px-4 flex justify-center shadow-sm">
        <div className="w-full max-w-lg relative">
          <div className="absolute left-3 top-3 text-xl">🔍</div>
          <input 
            type="text" 
            placeholder="이름, 정당, 지역구 검색 (예: 종로구)" 
            className="flex h-12 w-full rounded-full border border-slate-300 bg-white px-3 py-2 pl-10 text-lg shadow-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. 결과 리스트 영역 */}
      <div className="w-full max-w-6xl p-4 sm:p-10 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            📊 재산 순위 <span className="text-slate-400 text-lg font-normal">(Top {filteredMembers.length})</span>
          </h2>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl animate-spin mb-4">⏳</div>
            <p className="text-slate-500">데이터를 분석하고 있습니다...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => (
              <Link href={`/member/${member.name}`} key={member.id}>
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

                  {/* 재산 정보 */}
                  <div className="p-6 pt-2">
                    <div className="mt-2 bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">순자산 (빚 제외)</p>
                      <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span>💰</span>
                        {formatMoney(member.totalAssets)}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between text-sm items-center">
                      <span className="text-slate-500">지난 해 대비</span>
                      <div className={`flex items-center font-bold ${member.changeAmount >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {member.changeAmount >= 0 ? "▲" : "▼"}
                        <span className="ml-1">{Math.abs(member.changeRate).toFixed(1)}%</span>
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          ({member.changeAmount > 0 ? "+" : ""}{formatMoney(member.changeAmount)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            <p className="text-xl">검색 결과가 없습니다 😢</p>
          </div>
        )}
      </div>

      {/* 4. 플로팅 버튼 (위/아래 이동) */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        <button 
          onClick={scrollToTop}
          className="w-12 h-12 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-slate-50 hover:scale-110 transition-all active:scale-95 text-slate-600"
          title="맨 위로"
        >
          ⬆️
        </button>
        <button 
          onClick={scrollToBottom}
          className="w-12 h-12 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-slate-50 hover:scale-110 transition-all active:scale-95 text-slate-600"
          title="맨 아래로"
        >
          ⬇️
        </button>
      </div>

      {/* 5. 👇 여기에 이름을 추가했습니다! */}
      <footer className="w-full text-center border-t border-slate-200 py-8 mt-auto bg-slate-100">
        <p className="text-slate-500 text-sm">
          made by <strong className="text-blue-600">최임호</strong>
        </p>
      </footer>

    </main>
  );
}
