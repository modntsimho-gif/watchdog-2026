"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

// ✅ 설정: Disqus Shortname
const DISQUS_SHORTNAME = "ni-eolma"; 

// --------------------
// 1. 타입 정의
// --------------------
interface AssetItem {
  relationship: string;
  type: string;
  description: string;
  previous_value: number;
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
}

interface GroupedAssets {
  realEstate: AssetItem[];
  financial: AssetItem[];
  cars: AssetItem[];
  debt: AssetItem[];
  others: AssetItem[];
}

interface RawAssetMember {
  name: string;
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
// 2. 컴포넌트 시작
// --------------------
export default function MemberDetail({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [grouped, setGrouped] = useState<GroupedAssets>({
    realEstate: [],
    financial: [],
    cars: [],
    debt: [],
    others: [],
  });
  const [loading, setLoading] = useState(true);
  
  // 댓글 모달 상태
  const [showComments, setShowComments] = useState(false);

  const decodedName = decodeURIComponent(name);

  // 데이터 로딩
  useEffect(() => {
    window.scrollTo(0, 0);

    async function fetchData() {
      try {
        const [assetsRes, profilesRes] = await Promise.all([
          fetch("/assembly_assets.json"),
          fetch("/members_info.json"),
        ]);

        if (!assetsRes.ok || !profilesRes.ok) throw new Error("데이터 로딩 실패");

        const rawAssets: RawAssetMember[] = await assetsRes.json();
        const rawProfiles: RawProfile[] = await profilesRes.json();

        const targetAsset = rawAssets.find((p) => p.name === decodedName);
        const targetProfile = rawProfiles.find(
          (p) => p.NAAS_NM === decodedName && p.STATUS_NM === "현직의원"
        );

        if (targetAsset) {
          const total = targetAsset.assets.reduce((sum, item) => {
            const isDebt = item.type.includes("채무") || item.description.includes("채무");
            return isDebt ? sum - item.current_value : sum + item.current_value;
          }, 0);

          const groups: GroupedAssets = {
            realEstate: [],
            financial: [],
            cars: [],
            debt: [],
            others: [],
          };

          targetAsset.assets.forEach((item) => {
            const t = item.type;
            const d = item.description;

            if (t.includes("채무") || d.includes("채무")) {
              groups.debt.push(item);
            } 
            else if (t.includes("자동차") || t.includes("승용차") || t.includes("차량")) {
              groups.cars.push(item);
            }
            else if (
              t.includes("토지") || t.includes("건물") || t.includes("주택") || 
              t.includes("아파트") || t.includes("대지") || t.includes("임야") || 
              t.includes("전") || t.includes("답") || t.includes("도로") || 
              t.includes("과수원") || t.includes("잡종지") || t.includes("목장") ||
              t.includes("오피스텔") || t.includes("상가") || t.includes("빌라") ||
              t.includes("전세") || t.includes("임차") || t.includes("권리") ||
              t.includes("창고") || 
              d.includes("건물") || d.includes("대지") || d.includes("임야") ||
              d.includes("아파트") || d.includes("창고") || d.includes("주택") ||
              d.includes("㎡")
            ) {
              groups.realEstate.push(item);
            } 
            else if (
              t.includes("예금") || t.includes("증권") || t.includes("채권") || 
              t.includes("회사채") || t.includes("국채") || t.includes("공채") ||
              t.includes("현금") || t.includes("신탁") || t.includes("펀드") || 
              t.includes("주식") || t.includes("보험") || t.includes("예탁") ||
              t.includes("사인간") || t.includes("대여금") || 
              d.includes("은행") || d.includes("농협") || d.includes("수협") || 
              d.includes("신협") || d.includes("금융") || d.includes("증권") || 
              d.includes("보험") || d.includes("생명") || d.includes("화재") ||
              d.includes("사인간") || d.includes("채권") || d.includes("대여금") ||
              d.includes("현금")
            ) {
              groups.financial.push(item);
            } 
            else {
              groups.others.push(item);
            }
          });

          groups.realEstate.sort((a, b) => b.current_value - a.current_value);
          groups.financial.sort((a, b) => b.current_value - a.current_value);
          groups.cars.sort((a, b) => b.current_value - a.current_value);
          groups.debt.sort((a, b) => b.current_value - a.current_value);
          groups.others.sort((a, b) => b.current_value - a.current_value);

          setMember({
            name: targetAsset.name,
            party: targetProfile?.PLPT_NM?.split("/").pop()?.trim() || "무소속",
            district: targetProfile?.ELECD_NM?.split("/").pop()?.trim() || "정보없음",
            imageUrl: targetProfile?.NAAS_PIC || "",
            totalAssets: total,
            assets: targetAsset.assets,
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
  }, [decodedName]);

  // 🔥 [핵심 수정] Disqus 로직: 모달 열릴 때마다 강제 리셋
  useEffect(() => {
    if (showComments && member) {
      
      // 약간의 지연을 줘서 모달이 완전히 그려진 후 실행 (안정성 확보)
      const timer = setTimeout(() => {
        // @ts-ignore
        if (window.DISQUS) {
          // 이미 로드된 경우: 리셋 명령
          // @ts-ignore
          window.DISQUS.reset({
            reload: true,
            config: function (this: any) {
              this.page.identifier = member.name;
              this.page.url = window.location.href;
            },
          });
        } else {
          // 처음인 경우: 스크립트 삽입
          // @ts-ignore
          window.disqus_config = function (this: any) {
            this.page.url = window.location.href;
            this.page.identifier = member.name;
          };
          
          const d = document;
          const s = d.createElement("script");
          s.src = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
          s.setAttribute("data-timestamp", new Date().toString());
          (d.head || d.body).appendChild(s);
        }
      }, 100); // 0.1초 딜레이

      return () => clearTimeout(timer);
    }
  }, [showComments, member]);

  // 모달 스크롤 방지
  useEffect(() => {
    if (showComments) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [showComments]);

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
      
      {/* 1. 상단 프로필 (Sticky Header) - 안전한 색상 사용 */}
      <div className="bg-[rgba(255,255,255,0.95)] backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
              ← 목록으로
            </Link>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 truncate">
                  {member.name}
                  <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full text-white font-normal flex-shrink-0 ${
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

            <button 
              onClick={() => setShowComments(true)}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span className="text-lg">💬</span>
              <span className="text-xs sm:text-sm font-bold">토론장</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        
        {/* 2. 자산 요약 대시보드 - 안전한 색상 사용 */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard 
            title="🏢 부동산" 
            amount={getGroupTotal(grouped.realEstate)} 
            color="text-slate-700" 
            bg="bg-white" 
            onClick={() => scrollToSection("section-realestate")} 
          />
          <SummaryCard 
            title="💰 예금/증권/현금" 
            amount={getGroupTotal(grouped.financial)} 
            color="text-blue-600" 
            bg="bg-[rgba(239,246,255,0.6)]" 
            onClick={() => scrollToSection("section-financial")}
          />
          
          {grouped.cars.length > 0 ? (
            <SummaryCard 
              title="🚗 자동차" 
              amount={getGroupTotal(grouped.cars)} 
              color="text-slate-600" 
              bg="bg-white" 
              onClick={() => scrollToSection("section-cars")}
            />
          ) : (
             <SummaryCard 
              title="💎 기타자산" 
              amount={getGroupTotal(grouped.others)} 
              color="text-slate-600" 
              bg="bg-white" 
              onClick={() => scrollToSection("section-others")}
             />
          )}

          <SummaryCard 
            title="📉 채무" 
            amount={getGroupTotal(grouped.debt)} 
            color="text-red-500" 
            bg="bg-[rgba(254,242,242,0.6)]" 
            isDebt 
            onClick={() => scrollToSection("section-debt")}
          />
        </div>

        {/* 3. 상세 리스트 섹션 */}
        {grouped.realEstate.length > 0 && (
          <Section id="section-realestate" title="🏢 부동산 (토지/건물)" count={grouped.realEstate.length} total={getGroupTotal(grouped.realEstate)} formatMoney={formatMoney}>
            {grouped.realEstate.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}
          </Section>
        )}

        {grouped.financial.length > 0 && (
          <Section id="section-financial" title="💰 금융 (예금/증권/현금)" count={grouped.financial.length} total={getGroupTotal(grouped.financial)} formatMoney={formatMoney}>
            {grouped.financial.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}
          </Section>
        )}

        {grouped.cars.length > 0 && (
          <Section id="section-cars" title="🚗 자동차" count={grouped.cars.length} total={getGroupTotal(grouped.cars)} formatMoney={formatMoney}>
            {grouped.cars.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}
          </Section>
        )}

        {grouped.others.length > 0 && (
          <Section id="section-others" title="💎 기타 (회원권/보석 등)" count={grouped.others.length} total={getGroupTotal(grouped.others)} formatMoney={formatMoney}>
            {grouped.others.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}
          </Section>
        )}

        {grouped.debt.length > 0 && (
          <Section id="section-debt" title="📉 채무 (빚)" count={grouped.debt.length} total={getGroupTotal(grouped.debt)} formatMoney={formatMoney} isDebt>
            {grouped.debt.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} isDebt />)}
          </Section>
        )}

      </div>

      {/* 🔥 댓글 모달 (안전한 RGBA 배경색) */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${
          showComments ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* 배경 */}
        <div 
          className="absolute inset-0 bg-[rgba(15,23,42,0.6)] backdrop-blur-sm"
          onClick={() => setShowComments(false)}
        />
        
        {/* 모달 컨텐츠 */}
        <div className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-transform duration-200 ${
          showComments ? "scale-100" : "scale-95"
        }`}>
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              🗣️ {member.name} 의원 토론장
            </h3>
            <button 
              onClick={() => setShowComments(false)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Disqus 영역 */}
          <div className="p-6 overflow-y-auto bg-slate-50 flex-1 relative">
            {/* 로딩 표시 (Disqus가 로드되면 덮여서 안 보임) */}
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none">
              <span className="animate-pulse">💬 댓글창을 불러오는 중...</span>
            </div>
            {/* 실제 댓글창 */}
            <div id="disqus_thread" className="min-h-[300px] relative z-10"></div>
          </div>
        </div>
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
