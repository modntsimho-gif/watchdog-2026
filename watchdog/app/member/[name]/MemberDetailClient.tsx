"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// --------------------
// 1. 타입 정의
// --------------------
interface AssetItem {
  relationship: string;
  type: string;
  description: string;
  previous_value: number;
  increase?: number;
  decrease?: number;
  current_value: number;
  reason: string;
}

interface MemberDetail {
  name: string;
  party: string;    
  district: string; 
  imageUrl: string;
  totalAssets: number;
  assets: AssetItem[];
  isGov?: boolean; 
}

interface GroupedAssets {
  realEstate: AssetItem[];
  financial: AssetItem[];
  virtual: AssetItem[]; 
  cars: AssetItem[];
  debt: AssetItem[];
  others: AssetItem[];
}

interface RawAssetMember {
  name: string;
  assets: AssetItem[];
}

interface GovOfficial {
  name: string;
  affiliation: string;
  assets: AssetItem[];
}

interface RawProfile {
  NAAS_NM: string;
  PLPT_NM: string;
  ELECD_NM: string;
  NAAS_PIC: string;
  STATUS_NM: string;
}

// --------------------
// 2. 메인 컴포넌트
// --------------------
export default function MemberDetail({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [grouped, setGrouped] = useState<GroupedAssets>({
    realEstate: [],
    financial: [],
    virtual: [],
    cars: [],
    debt: [],
    others: [],
  });
  const [loading, setLoading] = useState(true);

  const decodedName = decodeURIComponent(name);

  // 데이터 로딩
  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetchData() {
      try {
        const [assemblyRes, profilesRes, govRes] = await Promise.all([
          fetch("/assembly_assets.json"),
          fetch("/members_info.json"),
          fetch("/officials_property.json")
        ]);

        if (!assemblyRes.ok || !profilesRes.ok || !govRes.ok) throw new Error("데이터 로딩 실패");

        const rawAssembly: RawAssetMember[] = await assemblyRes.json();
        const rawProfiles: RawProfile[] = await profilesRes.json();
        const rawGovData = await govRes.json();
        const rawGov: GovOfficial[] = Array.isArray(rawGovData) ? rawGovData : (rawGovData.officials || []);

        let targetAsset: any = null;
        let isGov = false;

        // 타입에 따른 데이터 검색
        if (typeParam === "government") {
          targetAsset = rawGov.find((p) => p.name === decodedName);
          isGov = true;
        } else if (typeParam === "assembly") {
          targetAsset = rawAssembly.find((p) => p.name === decodedName);
          isGov = false;
        } else {
          targetAsset = rawAssembly.find((p) => p.name === decodedName);
          if (!targetAsset) {
            targetAsset = rawGov.find((p) => p.name === decodedName);
            if (targetAsset) isGov = true;
          }
        }

        let targetProfile = null;
        if (!isGov) {
          targetProfile = rawProfiles.find(
            (p) => p.NAAS_NM === decodedName && p.STATUS_NM === "현직의원"
          );
        }

        if (targetAsset) {
          const groups: GroupedAssets = {
            realEstate: [],
            financial: [],
            virtual: [],
            cars: [],
            debt: [],
            others: [],
          };

          let totalCalculated = 0;

          targetAsset.assets.forEach((item: AssetItem) => {
            let currentValue = item.current_value;
            if (currentValue === 0 && (item.previous_value !== 0 || (item.increase || 0) !== 0)) {
              currentValue = item.previous_value + (item.increase || 0) - (item.decrease || 0);
            }
            item.current_value = currentValue;

            const t = item.type || "";
            const d = item.description || "";

            let category = "others";
            
            if (t.includes("채무") || d.includes("채무")) {
              category = "debt";
              totalCalculated -= currentValue;
            } else {
              totalCalculated += currentValue;
              
              if (t.includes("자동차") || t.includes("승용차") || t.includes("선박")) {
                category = "cars";
              } else if (t.includes("가상자산") || t.includes("암호화폐") || d.includes("가상자산")) {
                category = "virtual";
              } else if (
                t.includes("토지") || t.includes("건물") || t.includes("주택") || 
                t.includes("아파트") || t.includes("대지") || t.includes("임야") || 
                t.includes("전") || t.includes("답") || t.includes("도로") || 
                t.includes("과수원") || t.includes("잡종지") || t.includes("목장") ||
                t.includes("오피스텔") || t.includes("상가") || t.includes("빌라") ||
                t.includes("전세") || t.includes("임차") || t.includes("권리") ||
                t.includes("창고") || d.includes("건물") || d.includes("대지") || 
                d.includes("임야") || d.includes("아파트") || d.includes("창고") || 
                d.includes("주택") || d.includes("㎡")
              ) {
                category = "realEstate";
              } else if (
                t === "" || 
                t.includes("예금") || t.includes("증권") || t.includes("채권") || 
                t.includes("회사채") || t.includes("국채") || t.includes("공채") ||
                t.includes("현금") || t.includes("신탁") || t.includes("펀드") || 
                t.includes("주식") || t.includes("보험") || t.includes("예탁") ||
                t.includes("사인간") || t.includes("대여금") || d.includes("은행") || 
                d.includes("농협") || d.includes("수협") || d.includes("신협") || 
                d.includes("금융") || d.includes("증권") || d.includes("보험") || 
                d.includes("생명") || d.includes("화재") || d.includes("사인간") || 
                d.includes("채권") || d.includes("대여금") || d.includes("현금")
              ) {
                category = "financial";
              }
            }

            if (category === "debt") groups.debt.push(item);
            else if (category === "cars") groups.cars.push(item);
            else if (category === "virtual") groups.virtual.push(item);
            else if (category === "realEstate") groups.realEstate.push(item);
            else if (category === "financial") groups.financial.push(item);
            else groups.others.push(item);
          });

          const sortByValue = (a: AssetItem, b: AssetItem) => b.current_value - a.current_value;
          groups.realEstate.sort(sortByValue);
          groups.financial.sort(sortByValue);
          groups.virtual.sort(sortByValue);
          groups.cars.sort(sortByValue);
          groups.debt.sort(sortByValue);
          groups.others.sort(sortByValue);

          setMember({
            name: targetAsset.name,
            party: isGov ? (targetAsset.affiliation || "정부") : (targetProfile?.PLPT_NM?.split("/").pop()?.trim() || "무소속"),
            district: isGov ? "공직자" : (targetProfile?.ELECD_NM?.split("/").pop()?.trim() || "정보없음"),
            imageUrl: isGov ? "" : (targetProfile?.NAAS_PIC || ""),
            totalAssets: totalCalculated,
            assets: targetAsset.assets,
            isGov: isGov
          });
          setGrouped(groups);
        }
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    }
    fetchData();
  }, [decodedName, typeParam]);

  const formatMoney = (amount: number) => {
    const realAmount = amount * 1000;
    if (realAmount === 0) return "0원";
    const sign = realAmount < 0 ? "-" : "";
    const absAmount = Math.abs(realAmount);
    const uk = Math.floor(absAmount / 100000000);
    const rest = absAmount % 100000000;
    const man = Math.floor(rest / 10000);
    if (uk > 0) return `${sign}${uk}억 ${man > 0 ? man + "만" : ""}원`;
    return `${sign}${man}만원`;
  };

  const getGroupTotal = (items: AssetItem[]) => {
    return items.reduce((sum, item) => sum + item.current_value, 0);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-2xl animate-spin">⏳</div></div>;
  if (!member) return <div className="min-h-screen flex items-center justify-center">정보 없음</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      
      {/* 상단 프로필 */}
      <div className="bg-[rgba(255,255,255,0.95)] backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link 
              href={member?.isGov ? "/?view=government" : "/?view=assembly"} 
              className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
            >
              ← 목록으로
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    {member.isGov ? "🏢" : "👤"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 truncate">
                  {member.name}
                  <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full text-white font-normal flex-shrink-0 ${
                    member.isGov ? 'bg-indigo-500' :
                    member.party.includes("국민의힘") ? 'bg-red-500' : 
                    member.party.includes("민주당") ? 'bg-blue-500' : 
                    member.party.includes("조국") ? 'bg-blue-800' : 
                    member.party.includes("개혁") ? 'bg-orange-500' : 'bg-slate-500'
                  }`}>
                    {member.party}
                  </span>
                </h1>
                <div className="text-sm sm:text-base font-extrabold text-slate-800 truncate">
                  {formatMoney(member.totalAssets)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard title="🏢 부동산" amount={getGroupTotal(grouped.realEstate)} color="text-slate-700" bg="bg-white" onClick={() => scrollToSection("section-realestate")} />
          <SummaryCard title="💰 예금/증권/현금" amount={getGroupTotal(grouped.financial)} color="text-blue-600" bg="bg-[rgba(239,246,255,0.6)]" onClick={() => scrollToSection("section-financial")} />
          
          {grouped.virtual.length > 0 ? (
            <SummaryCard title="🪙 가상자산" amount={getGroupTotal(grouped.virtual)} color="text-purple-600" bg="bg-purple-50" onClick={() => scrollToSection("section-virtual")} />
          ) : grouped.cars.length > 0 ? (
            <SummaryCard title="🚗 자동차" amount={getGroupTotal(grouped.cars)} color="text-slate-600" bg="bg-white" onClick={() => scrollToSection("section-cars")} />
          ) : (
             <SummaryCard title="💎 기타자산" amount={getGroupTotal(grouped.others)} color="text-slate-600" bg="bg-white" onClick={() => scrollToSection("section-others")} />
          )}

          <SummaryCard title="📉 채무" amount={getGroupTotal(grouped.debt)} color="text-red-500" bg="bg-[rgba(254,242,242,0.6)]" isDebt onClick={() => scrollToSection("section-debt")} />
        </div>

        {/* 상세 리스트 */}
        {grouped.realEstate.length > 0 && <Section id="section-realestate" title="🏢 부동산" count={grouped.realEstate.length} total={getGroupTotal(grouped.realEstate)} formatMoney={formatMoney}>{grouped.realEstate.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.financial.length > 0 && <Section id="section-financial" title="💰 금융" count={grouped.financial.length} total={getGroupTotal(grouped.financial)} formatMoney={formatMoney}>{grouped.financial.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        
        {grouped.virtual.length > 0 && <Section id="section-virtual" title="🪙 가상자산" count={grouped.virtual.length} total={getGroupTotal(grouped.virtual)} formatMoney={formatMoney}>{grouped.virtual.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        
        {grouped.cars.length > 0 && <Section id="section-cars" title="🚗 자동차" count={grouped.cars.length} total={getGroupTotal(grouped.cars)} formatMoney={formatMoney}>{grouped.cars.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.others.length > 0 && <Section id="section-others" title="💎 기타" count={grouped.others.length} total={getGroupTotal(grouped.others)} formatMoney={formatMoney}>{grouped.others.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.debt.length > 0 && <Section id="section-debt" title="📉 채무" count={grouped.debt.length} total={getGroupTotal(grouped.debt)} formatMoney={formatMoney} isDebt>{grouped.debt.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} isDebt />)}</Section>}
      </div>
    </main>
  );
}

// --------------------
// 3. 하위 컴포넌트
// --------------------

function SummaryCard({ title, amount, color, bg, isDebt = false, onClick }: any) {
  const formatSimple = (val: number) => {
    const real = val * 1000;
    if (real === 0) return "-";
    const uk = Math.floor(real / 100000000);
    if (uk > 0) return `${uk}억+`;
    return `${Math.floor(real / 10000)}만+`;
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border border-slate-200 shadow-sm ${bg} cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform`}
    >
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <p className={`text-lg font-bold ${color}`}>
        {isDebt && amount > 0 ? "-" : ""}{formatSimple(amount)}
      </p>
    </div>
  );
}

function Section({ id, title, count, total, children, formatMoney, isDebt }: any) {
  return (
    <section id={id} className="scroll-mt-48"> 
      <div className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {title} <span className="text-xs font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{count}건</span>
        </h2>
        <span className={`text-sm font-bold ${isDebt ? 'text-red-500' : 'text-slate-600'}`}>
          {isDebt ? "-" : ""}{formatMoney(total)}
        </span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function AssetRow({ item, formatMoney, isDebt }: any) {
  return (
    <div className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
            item.relationship === "본인" ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-500"
          }`}>
            {item.relationship}
          </span>
          <span className="text-xs font-semibold text-slate-700">{item.type}</span>
        </div>
        <p className="text-sm text-slate-600 break-keep leading-snug">
          {item.description}
        </p>
      </div>
      <div className="text-right flex-shrink-0 mt-2 sm:mt-0">
        <p className={`text-sm font-bold ${isDebt ? 'text-red-500' : 'text-slate-800'}`}>
          {isDebt ? "-" : ""}{formatMoney(item.current_value)}
        </p>
        {item.reason && item.reason !== "변동없음" && (
          <p className="text-xs text-slate-400 mt-0.5">{item.reason}</p>
        )}
      </div>
    </div>
  );
}
