"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useSearchParams, useRouter } from "next/navigation";

// ✅ Supabase 설정
const SUPABASE_URL = "https://aiohwgfgtpspiuphfwoz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb2h3Z2ZndHBzcGl1cGhmd296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzEyMDIsImV4cCI6MjA4NTg0NzIwMn0.GEzYz9YaLK8dbWs0dyY4jtiTb6IYl4IORcvQqUm2WWk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1. 데이터 인터페이스 정의 ---

interface AssemblyAssetItem {
  type: string;
  description: string;
  previous_value: number;
  current_value: number;
}
interface AssemblyMember {
  name: string;
  assets: AssemblyAssetItem[];
}

interface RawProfile {
  NAAS_NM: string;       
  PLPT_NM: string;       
  ELECD_NM: string;      
  NAAS_PIC: string;      
  STATUS_NM: string;     
}

// 통합된 멤버 구조
interface Member {
  id: string;
  name: string;
  party: string;    
  district: string; 
  imageUrl: string;
  
  totalAssets: number;
  realEstate: number;
  cars: number;
  financial: number;
  virtual: number; // ✅ 가상자산 추가
  debt: number;

  changeAmount: number; 
  changeRate: number;
  isGov?: boolean;
  
  originalIndex: number; 
}

// ✅ 탭 타입에 'virtual' 추가
type TabType = "total" | "realEstate" | "cars" | "financial" | "virtual" | "debt" | "rank";
type ViewType = "assembly" | "government"; 

let cachedAssembly: Member[] | null = null;
let cachedGovernment: Member[] | null = null;

// ------------------------------------------------------------------
// 2. 메인 로직 컴포넌트
// ------------------------------------------------------------------
function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 파라미터 확인
  const initialView = (searchParams.get("view") as ViewType) || "assembly";

  const [viewType, setViewType] = useState<ViewType>(initialView);
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabType>(
    initialView === "government" ? "rank" : "total"
  );
  
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData(viewType);
    fetchCommentCounts();
  }, [viewType]);

  const toggleViewType = () => {
    const newType = viewType === "assembly" ? "government" : "assembly";
    setViewType(newType);
    setActiveTab(newType === "government" ? "rank" : "total");
    router.replace(`/?view=${newType}`, { scroll: false });
  };

  async function fetchData(type: ViewType) {
    setLoading(true);
    setMembers([]); 

    try {
      if (type === "assembly") {
        if (cachedAssembly) {
          setMembers(cachedAssembly);
          setLoading(false);
          return;
        }

        const [assetsRes, profilesRes] = await Promise.all([
          fetch("/assembly_assets.json"),
          fetch("/members_info.json"),
        ]);

        if (!assetsRes.ok || !profilesRes.ok) throw new Error("국회 데이터 로딩 실패");

        const rawAssets: AssemblyMember[] = await assetsRes.json();
        const rawProfiles: RawProfile[] = await profilesRes.json();

        const profileMap = new Map<string, RawProfile>();
        rawProfiles.forEach((p) => {
          if (p.STATUS_NM === "현직의원") profileMap.set(p.NAAS_NM, p);
        });

        const processed = rawAssets.map((person, index) => {
          let realEstate = 0, cars = 0, financial = 0, virtual = 0, debt = 0, totalAssets = 0, prevTotal = 0;

          person.assets.forEach((item) => {
            const t = item.type;
            const d = item.description;
            const val = item.current_value;
            const prev = item.previous_value;

            if (t.includes("채무") || d.includes("채무")) {
              debt += val;
              totalAssets -= val;
              prevTotal -= prev;
            } else if (t.includes("자동차") || t.includes("선박") || t.includes("항공기")) {
              cars += val;
              totalAssets += val;
              prevTotal += prev;
            } else if (t.includes("가상자산") || t.includes("암호화폐") || d.includes("가상자산")) {
              // ✅ 가상자산 분류 로직
              virtual += val;
              totalAssets += val;
              prevTotal += prev;
            } else if (t.includes("토지") || t.includes("건물") || t.includes("아파트") || t.includes("전세") || t.includes("상가")) {
              realEstate += val;
              totalAssets += val;
              prevTotal += prev;
            } else if (t.includes("예금") || t.includes("증권") || t.includes("채권") || t.includes("현금") || t.includes("주식")) {
              financial += val;
              totalAssets += val;
              prevTotal += prev;
            } else {
              totalAssets += val;
              prevTotal += prev;
            }
          });

          const changeAmount = totalAssets - prevTotal;
          const changeRate = prevTotal === 0 ? 0 : (changeAmount / prevTotal) * 100;
          const profile = profileMap.get(person.name);

          return {
            id: `asm-${index}`,
            name: person.name,
            party: profile?.PLPT_NM?.split("/").pop()?.trim() || "무소속",
            district: profile?.ELECD_NM?.split("/").pop()?.trim() || "정보없음",
            imageUrl: profile?.NAAS_PIC || "",
            totalAssets, realEstate, cars, financial, virtual, debt, changeAmount, changeRate,
            isGov: false,
            originalIndex: index
          };
        });

        processed.sort((a, b) => b.totalAssets - a.totalAssets);
        cachedAssembly = processed;
        setMembers(processed);

      } else {
        if (cachedGovernment) {
           if (cachedGovernment.length > 0 && typeof cachedGovernment[0].originalIndex === 'number') {
            setMembers(cachedGovernment);
            setLoading(false);
            return;
          }
        }

        const res = await fetch("/officials_property.json");
        if (!res.ok) throw new Error("정부 공직자 데이터 로딩 실패");
        
        const rawData = await res.json();
        const officials: any[] = Array.isArray(rawData) ? rawData : (rawData.officials || []);

        const processed = officials.map((person, index) => {
          let realEstate = 0, cars = 0, financial = 0, virtual = 0, debt = 0;
          let calculatedTotal = 0;

          if (Array.isArray(person.assets)) {
            person.assets.forEach((item: any) => {
              let val = item.current_value;
              if (val === 0 && (item.previous_value > 0 || item.increase > 0)) {
                val = (item.previous_value || 0) + (item.increase || 0) - (item.decrease || 0);
              }
              if (val < 0) val = 0;

              const type = item.type || ""; 
              const desc = item.description || "";

              if (type.includes("채무") || desc.includes("채무")) {
                debt += val;
                calculatedTotal -= val;
              } else {
                calculatedTotal += val;
                
                if (type.includes("자동차") || type.includes("승용차") || type.includes("선박")) {
                  cars += val;
                } else if (type.includes("가상자산") || type.includes("암호화폐") || desc.includes("가상자산")) {
                  // ✅ 정부 데이터 가상자산 분류
                  virtual += val;
                } else if (
                  type.includes("토지") || type.includes("임야") || type.includes("대지") || 
                  type.includes("전") || type.includes("답") || type.includes("도로") ||
                  type.includes("건물") || type.includes("아파트") || type.includes("주택") || 
                  type.includes("상가") || type.includes("오피스텔") || type.includes("빌딩") ||
                  type.includes("전세") || type.includes("임차") || type.includes("분양권") ||
                  desc.includes("건물") || desc.includes("아파트")
                ) {
                  realEstate += val;
                } else if (
                  type === "" || 
                  type.includes("예금") || type.includes("증권") || type.includes("채권") || 
                  type.includes("주식") || type.includes("현금") || type.includes("보험") ||
                  desc.includes("은행") || desc.includes("보험") || desc.includes("증권")
                ) {
                  financial += val;
                }
              }
            });
          }

          return {
            id: `gov-${index}`,
            name: person.name || "이름없음",
            party: person.affiliation || "정부",
            district: person.position || "공직자",
            imageUrl: "", 
            totalAssets: calculatedTotal,
            realEstate,
            cars,
            financial,
            virtual,
            debt,
            changeAmount: 0,
            changeRate: 0,
            isGov: true,
            originalIndex: index 
          };
        });

        processed.sort((a, b) => b.totalAssets - a.totalAssets);
        cachedGovernment = processed;
        setMembers(processed);
      }

      setLoading(false);
    } catch (error) {
      console.error("데이터 로딩 에러:", error);
      setLoading(false);
    }
  }

  async function fetchCommentCounts() {
    try {
      const { data, error } = await supabase.from("comments").select("member_name");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        counts[row.member_name] = (counts[row.member_name] || 0) + 1;
      });
      setCommentCounts(counts);
    } catch (err) {
      console.error("댓글 카운트 로딩 실패:", err);
    }
  }

  // ✅ 정렬 로직에 virtual 추가
  const sortedMembers = (() => {
    let sorted = [...members];
    if (activeTab === "rank") sorted.sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0));
    else if (activeTab === "total") sorted.sort((a, b) => b.totalAssets - a.totalAssets);
    else if (activeTab === "realEstate") sorted.sort((a, b) => b.realEstate - a.realEstate);
    else if (activeTab === "cars") sorted.sort((a, b) => b.cars - a.cars);
    else if (activeTab === "financial") sorted.sort((a, b) => b.financial - a.financial);
    else if (activeTab === "virtual") sorted.sort((a, b) => b.virtual - a.virtual); // ✅ 코인 정렬
    else if (activeTab === "debt") sorted.sort((a, b) => b.debt - a.debt);
    return sorted;
  })();

  const filteredMembers = sortedMembers.filter((member) =>
    member.name.includes(searchTerm) || 
    member.party.includes(searchTerm) ||
    member.district.includes(searchTerm)
  );

  const formatMoney = (amount: number) => {
    const realAmount = amount * 1000; 
    if (realAmount === 0) return "0원";
    const uk = Math.floor(Math.abs(realAmount) / 100000000);
    const man = Math.floor((Math.abs(realAmount) % 100000000) / 10000);
    const sign = realAmount < 0 ? "-" : "";
    if (uk > 0) return `${sign}${uk}억 ${man > 0 ? man + "만" : ""}원`;
    return `${sign}${man}만원`;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  const getTabStyle = (tab: TabType) => {
    const base = "px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ";
    if (activeTab === tab) return base + "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105";
    return base + "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700";
  };

  const getDisplayValue = (member: Member) => {
    switch (activeTab) {
      case "rank": return { label: "순자산 (의전서열)", value: member.totalAssets, icon: "⚖️" };
      case "realEstate": return { label: "부동산 자산", value: member.realEstate, icon: "🏢" };
      case "cars": return { label: "자동차 자산", value: member.cars, icon: "🚗" };
      case "financial": return { label: "현금성 자산", value: member.financial, icon: "💵" };
      case "virtual": return { label: "가상자산 (코인)", value: member.virtual, icon: "🪙" }; // ✅ 표시 로직
      case "debt": return { label: "총 부채", value: -member.debt, icon: "💸" };
      default: return { label: "순자산 (빚 제외)", value: member.totalAssets, icon: "💰" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center relative">
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1019593213463092"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      {/* 상단 타이틀 및 모드 전환 버튼 */}
      <div className="w-full bg-slate-50 pt-16 pb-8 px-4 flex flex-col items-center justify-center border-b border-slate-200">
        <p className="font-mono text-sm mb-4 text-slate-500">
          🕵️‍♀️ 공직자 재산 감시 프로젝트 <span className="font-bold text-slate-800">WatchDog</span>
        </p>
        
        <h1 className="flex flex-col items-center text-center">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            대한민국 {viewType === "assembly" ? "국회의원" : "공직자"} 재산 순위
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-blue-600 mb-6">
            너 얼마있어?
          </span>
        </h1>

        <button
          onClick={toggleViewType}
          className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-indigo-600 font-lg rounded-full hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
        >
          {viewType === "assembly" ? "🏛️ 이재명 정부 공직자 보기" : "🏛️ 국회의원 보기"}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>
      </div>

      {/* 탭 & 검색창 */}
      <div className="sticky top-0 z-50 w-full bg-slate-50/90 backdrop-blur-md border-b border-slate-200 py-4 px-4 flex flex-col items-center shadow-sm gap-4">
        <div className="w-full max-w-lg relative">
          <div className="absolute left-3 top-3 text-xl">🔍</div>
          <input 
            type="text" 
            placeholder={viewType === "assembly" ? "이름, 정당, 지역구 검색" : "이름, 소속, 직위 검색"}
            className="flex h-12 w-full rounded-full border border-slate-300 bg-white px-3 py-2 pl-10 text-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full max-w-2xl justify-start sm:justify-center pb-2 sm:pb-0 scrollbar-hide px-2">
          {viewType === "government" && (
            <button onClick={() => setActiveTab("rank")} className={getTabStyle("rank")}>의전서열 ⚖️</button>
          )}
          <button onClick={() => setActiveTab("total")} className={getTabStyle("total")}>순자산 💰</button>
          <button onClick={() => setActiveTab("realEstate")} className={getTabStyle("realEstate")}>부동산 🏢</button>
          <button onClick={() => setActiveTab("cars")} className={getTabStyle("cars")}>자동차 🚗</button>
          <button onClick={() => setActiveTab("financial")} className={getTabStyle("financial")}>현금부자 💵</button>
          <button onClick={() => setActiveTab("virtual")} className={getTabStyle("virtual")}>코인왕 🪙</button>
          <button onClick={() => setActiveTab("debt")} className={getTabStyle("debt")}>빚쟁이 📉</button>
        </div>
      </div>

      {/* 결과 리스트 */}
      <div className="w-full max-w-6xl p-4 sm:p-10 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            📊 {activeTab === "rank" ? "의전서열 순서" :
                activeTab === "total" ? "전체 랭킹" : 
                activeTab === "realEstate" ? "부동산 부자 순위" :
                activeTab === "cars" ? "슈퍼카 순위" :
                activeTab === "financial" ? "현금왕 순위" : 
                activeTab === "virtual" ? "코인왕 순위" : "빚쟁이 순위"} 
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
              const commentCount = commentCounts[member.name] || 0;
              const hasComments = commentCount > 0;

              let barColor = 'bg-slate-500';
              if (viewType === "assembly") {
                if (member.party.includes("국민의힘")) barColor = 'bg-red-600';
                else if (member.party.includes("민주당")) barColor = 'bg-blue-600';
                else if (member.party.includes("조국")) barColor = 'bg-blue-800';
                else if (member.party.includes("개혁")) barColor = 'bg-orange-500';
              } else {
                barColor = 'bg-indigo-500';
              }

              const rankValue = (member.originalIndex ?? index) + 1;
              const typeParam = member.isGov ? "government" : "assembly";

              return (
                <Link href={`/member/${member.name}?type=${typeParam}`} key={member.id} scroll={true}>
                  <div className="rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer group h-full flex flex-col">
                    <div className={`h-2 w-full ${barColor}`} />
                    
                    <div className="flex flex-col p-6 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 flex-shrink-0">
                            {member.imageUrl ? (
                              <Image 
                                src={member.imageUrl} 
                                alt={`${member.name} 사진`} 
                                fill
                                className="object-cover"
                                sizes="64px"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-200 text-slate-400">
                                {viewType === "assembly" ? "🏛️" : "🏢"}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 leading-none tracking-tight">
                              <span className="text-slate-500 text-sm font-normal bg-slate-100 px-2 py-0.5 rounded-md">
                                {activeTab === "rank" ? `서열 ${rankValue}위` : `${index + 1}위`}
                              </span>
                              {member.name}
                            </h3>
                            <p className="text-sm font-semibold text-slate-600 mt-2 line-clamp-1">{member.party}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">{member.district}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-2 flex-grow flex flex-col justify-end">
                      <div className={`mt-2 p-3 rounded-lg ${activeTab === 'debt' ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className={`text-xs mb-1 ${activeTab === 'debt' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                          {display.label}
                        </p>
                        <div className={`text-2xl font-bold flex items-center gap-2 ${activeTab === 'debt' ? 'text-red-600' : 'text-slate-800'}`}>
                          <span>{display.icon}</span>
                          {formatMoney(display.value)}
                        </div>
                      </div>
                      
                      {activeTab === "total" && member.changeAmount !== 0 && (
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
                      
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <div 
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            hasComments 
                              ? "bg-slate-800 text-white shadow-md scale-[1.02]" 
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <span className={hasComments ? "animate-pulse" : ""}>
                            {hasComments ? "🔥" : "💬"}
                          </span>
                          <span>
                            {commentCount} Comments
                          </span>
                        </div>
                      </div>

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

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <button onClick={scrollToTop} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600">⬆️</button>
        <button onClick={scrollToBottom} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600">⬇️</button>
      </div>

      <footer className="w-full bg-slate-900 text-slate-400 py-12 px-4 mt-auto">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">WatchDog : 대한민국 공직자 재산 감시</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              본 서비스는 대한민국 정부 및 국회 공직자윤리위원회가 공개한 <br className="hidden sm:block" />
              <span className="text-slate-300">공직자 재산등록사항 공개 목록(관보/공보)</span>을 기반으로 제작되었습니다.
            </p>
          </div>
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
          <a href="mailto:modntsimho@gmail.com" className="text-blue-600 font-bold hover:underline text-lg">
            modntsimho@gmail.com
          </a>
          <p className="text-xs text-slate-600">
            © 2026 WatchDog. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------
// 3. 메인 페이지 (Suspense Wrapper)
// ------------------------------------------------------------------
export default function Home() {
  return (
    <main>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-2xl animate-spin">⏳</div>
        </div>
      }>
        <HomeContent />
      </Suspense>
    </main>
  );
}
