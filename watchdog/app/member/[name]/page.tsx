"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// ✅ Supabase 설정
const SUPABASE_URL = "https://aiohwgfgtpspiuphfwoz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb2h3Z2ZndHBzcGl1cGhmd296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzEyMDIsImV4cCI6MjA4NTg0NzIwMn0.GEzYz9YaLK8dbWs0dyY4jtiTb6IYl4IORcvQqUm2WWk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --------------------
// 1. 타입 정의
// --------------------
interface AssetItem {
  relationship: string;
  type: string;
  description: string;
  previous_value: number;
  increase?: number; // 정부 데이터용
  decrease?: number; // 정부 데이터용
  current_value: number;
  reason: string;
}

interface MemberDetail {
  name: string;
  party: string;    // 정당 또는 소속(정부)
  district: string; // 지역구 또는 직위(정부)
  imageUrl: string;
  totalAssets: number;
  assets: AssetItem[];
  isGov?: boolean; // 정부 공직자 여부 플래그
}

interface GroupedAssets {
  realEstate: AssetItem[];
  financial: AssetItem[];
  cars: AssetItem[];
  debt: AssetItem[];
  others: AssetItem[];
}

// 국회의원용
interface RawAssetMember {
  name: string;
  assets: AssetItem[];
}

// 정부 공직자용
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

interface Comment {
  id: number;
  created_at: string;
  nickname: string;
  content: string;
  member_name: string;
  parent_id: number | null;
}

// --------------------
// 2. 메인 컴포넌트
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
  const [showComments, setShowComments] = useState(false);

  const decodedName = decodeURIComponent(name);

  // 데이터 로딩
  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetchData() {
      try {
        // 1. 모든 데이터 소스 병렬 로드
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

        // 2. 국회 데이터에서 검색
        let targetAsset: any = rawAssembly.find((p) => p.name === decodedName);
        let targetProfile = rawProfiles.find(
          (p) => p.NAAS_NM === decodedName && p.STATUS_NM === "현직의원"
        );
        let isGov = false;

        // 3. 국회에 없으면 정부 데이터에서 검색
        if (!targetAsset) {
          targetAsset = rawGov.find((p) => p.name === decodedName);
          if (targetAsset) {
            isGov = true;
          }
        }

        if (targetAsset) {
          // --- 자산 그룹화 및 계산 로직 ---
          const groups: GroupedAssets = {
            realEstate: [],
            financial: [],
            cars: [],
            debt: [],
            others: [],
          };

          let totalCalculated = 0;

          targetAsset.assets.forEach((item: AssetItem) => {
            // 🚨 [중요] 현재가액 계산 로직 (정부 데이터 0원 방지)
            let currentValue = item.current_value;
            
            // current_value가 0이고, 증감 내역이 있다면 역산
            if (currentValue === 0 && (item.previous_value !== 0 || (item.increase || 0) !== 0)) {
              currentValue = item.previous_value + (item.increase || 0) - (item.decrease || 0);
            }
            
            // 계산된 값을 item에 덮어쓰기 (화면 표시용)
            item.current_value = currentValue;

            const t = item.type || "";
            const d = item.description || "";

            // 자산 분류
            let category = "others";
            
            if (t.includes("채무") || d.includes("채무")) {
              category = "debt";
              totalCalculated -= currentValue; // 부채는 차감
            } else {
              totalCalculated += currentValue; // 자산은 합산
              
              if (t.includes("자동차") || t.includes("승용차") || t.includes("선박")) {
                category = "cars";
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
                t === "" || // 타입이 비어있으면 보통 예금
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

            // 그룹에 추가
            if (category === "debt") groups.debt.push(item);
            else if (category === "cars") groups.cars.push(item);
            else if (category === "realEstate") groups.realEstate.push(item);
            else if (category === "financial") groups.financial.push(item);
            else groups.others.push(item);
          });

          // 정렬 (금액 큰 순서)
          const sortByValue = (a: AssetItem, b: AssetItem) => b.current_value - a.current_value;
          groups.realEstate.sort(sortByValue);
          groups.financial.sort(sortByValue);
          groups.cars.sort(sortByValue);
          groups.debt.sort(sortByValue);
          groups.others.sort(sortByValue);

          // 멤버 정보 설정
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
  }, [decodedName]);

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
      
      {/* 상단 프로필 */}
      <div className="bg-[rgba(255,255,255,0.95)] backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            {/* 🚨 [수정됨] 뒤로가기 링크에 쿼리 파라미터 추가 */}
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

            <button 
              onClick={() => setShowComments(true)}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span className="text-lg">💬</span>
              <span className="text-xs sm:text-sm font-bold">댓글 보기</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard title="🏢 부동산" amount={getGroupTotal(grouped.realEstate)} color="text-slate-700" bg="bg-white" onClick={() => scrollToSection("section-realestate")} />
          <SummaryCard title="💰 예금/증권/현금" amount={getGroupTotal(grouped.financial)} color="text-blue-600" bg="bg-[rgba(239,246,255,0.6)]" onClick={() => scrollToSection("section-financial")} />
          {grouped.cars.length > 0 ? (
            <SummaryCard title="🚗 자동차" amount={getGroupTotal(grouped.cars)} color="text-slate-600" bg="bg-white" onClick={() => scrollToSection("section-cars")} />
          ) : (
             <SummaryCard title="💎 기타자산" amount={getGroupTotal(grouped.others)} color="text-slate-600" bg="bg-white" onClick={() => scrollToSection("section-others")} />
          )}
          <SummaryCard title="📉 채무" amount={getGroupTotal(grouped.debt)} color="text-red-500" bg="bg-[rgba(254,242,242,0.6)]" isDebt onClick={() => scrollToSection("section-debt")} />
        </div>

        {/* 상세 리스트 */}
        {grouped.realEstate.length > 0 && <Section id="section-realestate" title="🏢 부동산" count={grouped.realEstate.length} total={getGroupTotal(grouped.realEstate)} formatMoney={formatMoney}>{grouped.realEstate.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.financial.length > 0 && <Section id="section-financial" title="💰 금융" count={grouped.financial.length} total={getGroupTotal(grouped.financial)} formatMoney={formatMoney}>{grouped.financial.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.cars.length > 0 && <Section id="section-cars" title="🚗 자동차" count={grouped.cars.length} total={getGroupTotal(grouped.cars)} formatMoney={formatMoney}>{grouped.cars.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.others.length > 0 && <Section id="section-others" title="💎 기타" count={grouped.others.length} total={getGroupTotal(grouped.others)} formatMoney={formatMoney}>{grouped.others.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} />)}</Section>}
        {grouped.debt.length > 0 && <Section id="section-debt" title="📉 채무" count={grouped.debt.length} total={getGroupTotal(grouped.debt)} formatMoney={formatMoney} isDebt>{grouped.debt.map((item, idx) => <AssetRow key={idx} item={item} formatMoney={formatMoney} isDebt />)}</Section>}
      </div>

      {/* 🔥 댓글 모달 */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${
          showComments ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div 
          className="absolute inset-0 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
          onClick={() => setShowComments(false)}
        />
        
        <div 
          className={`relative w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-200 ${
            showComments ? "scale-100" : "scale-95"
          }`}
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              🗣️ {member.name} {member.isGov ? "공직자" : "의원"}의 댓글
            </h3>
            <button 
              onClick={() => setShowComments(false)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* 내용 영역 */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
            {showComments && (
              <CommentSection memberName={member.name} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// --------------------
// 🔥 3. Supabase 댓글 컴포넌트 (대댓글 기능 추가)
// --------------------
function CommentSection({ memberName }: { memberName: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nickname: "", password: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  
  // ✅ 대댓글 상태 추가
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("member_name", memberName)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("댓글 불러오기 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [memberName]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nickname || !form.password || !form.content) {
      alert("닉네임, 비밀번호, 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert([
        {
          member_name: memberName,
          nickname: form.nickname,
          password: form.password,
          content: form.content,
          parent_id: replyingTo ? replyingTo.id : null, // ✅ 부모 ID 저장
        },
      ]);

      if (error) throw error;
      setForm({ ...form, content: "" });
      setReplyingTo(null); // ✅ 전송 후 답글 모드 해제
      await fetchComments();
    } catch (err) {
      console.error("댓글 작성 실패:", err);
      alert("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 댓글 그룹화 (부모-자식 연결)
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* 1. 댓글 목록 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
        {loading ? (
          <div className="text-center py-10 text-slate-400">불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-4xl mb-2">💬</div>
            <p>아직 작성된 의견이 없습니다.</p>
            <p className="text-xs mt-1">첫 번째 의견을 남겨보세요!</p>
          </div>
        ) : (
          rootComments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              {/* 부모 댓글 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{comment.nickname}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {/* ✅ 답글 버튼 */}
                  <button 
                    onClick={() => setReplyingTo(comment)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    답글달기
                  </button>
                </div>
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>

              {/* ✅ 대댓글 (들여쓰기) */}
              {getReplies(comment.id).map(reply => (
                <div key={reply.id} className="flex gap-2 pl-2">
                  <div className="text-slate-300 text-lg">└</div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-700 text-xs">{reply.nickname}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(reply.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs whitespace-pre-wrap leading-relaxed">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 2. 입력 폼 (고정 영역) */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        
        {/* ✅ 답글 모드일 때 표시되는 알림바 */}
        {replyingTo && (
          <div className="bg-blue-50 px-4 py-2 flex items-center justify-between border-b border-blue-100">
            <span className="text-xs text-blue-700 font-medium truncate">
              🚀 <b>{replyingTo.nickname}</b>님에게 답글 작성 중...
            </span>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-blue-400 hover:text-blue-600 px-2"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="닉네임" 
                className="w-1/3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                maxLength={10}
              />
              <input 
                type="password" 
                placeholder="비번" 
                className="w-1/3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                maxLength={8}
              />
              <div className="w-1/3 flex items-center justify-end text-xs text-slate-400">
                익명 보장 🔒
              </div>
            </div>
            <div className="flex gap-2">
              <textarea 
                placeholder={replyingTo ? "답글 내용을 입력하세요..." : "의견을 남겨주세요..."}
                className={`flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none h-12 py-3 ${replyingTo ? 'bg-blue-50/50' : ''}`}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {replyingTo ? "답글" : "등록"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// --------------------
// 4. 기타 하위 컴포넌트
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
