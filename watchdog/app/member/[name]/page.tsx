"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Asset {
  type: string;
  name: string;
  previous_value: number;
  current_value: number;
  change: number;
}

interface MemberDetail {
  name: string;
  party: string;
  district: string;
  imageUrl: string;
  totalAssets: number;
  totalDebt: number;
  assets: Asset[];
}

export default function MemberPage({ params }: { params: Promise<{ name: string }> }) {
  
  const { name } = use(params);
  const memberName = decodeURIComponent(name);
  
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [assetsRes, profilesRes] = await Promise.all([
          fetch("/assembly_assets.json"),
          fetch("/members_info.json"),
        ]);

        const rawAssets = await assetsRes.json();
        const rawProfiles = await profilesRes.json();

        const assetData = rawAssets.find((p: any) => p.name === memberName);
        const profileData = rawProfiles.find((p: any) => p.NAAS_NM === memberName && p.STATUS_NM === "현직의원");

        if (!assetData) {
          setLoading(false);
          return;
        }

        // 👇 [디버깅용] 데이터 구조를 확인하기 위해 콘솔에 출력합니다.
        // F12 -> Console 탭에서 확인 가능합니다.
        if (assetData.assets.length > 0) {
          console.log("📢 첫 번째 자산 데이터 구조:", assetData.assets[0]);
        }

        let totalAssets = 0;
        let totalDebt = 0;

        const processedAssets = assetData.assets.map((item: any) => {
          const isDebt = item.type.includes("채무");
          if (isDebt) {
            totalDebt += item.current_value;
            totalAssets -= item.current_value; 
          } else {
            totalAssets += item.current_value;
          }

          // 👇 여기가 핵심! 이름이 될만한 필드를 다 찾아봅니다.
          // description, remarks, cat2, section_name 등을 추가했습니다.
          const realName = item.description || item.detail || item.remarks || item.cat2 || item.section_name || item.name || item.type;

          return {
            type: item.type,
            name: realName, 
            previous_value: item.previous_value,
            current_value: item.current_value,
            change: item.current_value - item.previous_value,
          };
        });

        setMember({
          name: memberName,
          party: profileData?.PLPT_NM?.split("/").pop()?.trim() || "무소속",
          district: profileData?.ELECD_NM?.split("/").pop()?.trim() || "정보없음",
          imageUrl: profileData?.NAAS_PIC || "",
          totalAssets,
          totalDebt,
          assets: processedAssets,
        });

        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    }
    fetchData();
  }, [memberName]);

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

  const groupedAssets = member?.assets.reduce((acc, item) => {
    const key = item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Asset[]>);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-2xl">⏳ 데이터를 불러오는 중...</div>;
  if (!member) return <div className="min-h-screen flex items-center justify-center text-2xl">😢 데이터를 찾을 수 없습니다.</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-2xl hover:bg-slate-100 p-2 rounded-full transition-colors">⬅️</Link>
          <h1 className="text-xl font-bold text-slate-800">상세 재산 내역</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col sm:flex-row items-center gap-8 mb-10">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner flex-shrink-0">
            {member.imageUrl ? <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl">👤</div>}
          </div>
          <div className="text-center sm:text-left flex-1 w-full">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <h2 className="text-3xl font-extrabold text-slate-900">{member.name}</h2>
              <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${member.party.includes("국민의힘") ? 'bg-red-600' : member.party.includes("민주당") ? 'bg-blue-600' : member.party.includes("조국") ? 'bg-blue-800' : 'bg-slate-500'}`}>{member.party}</span>
            </div>
            <p className="text-slate-500 text-lg mb-6">{member.district}</p>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><p className="text-sm text-slate-500 mb-1">총 순자산 (빚 제외)</p><p className="text-2xl font-bold text-blue-600">{formatMoney(member.totalAssets)}</p></div>
              <div><p className="text-sm text-slate-500 mb-1">총 부채</p><p className="text-2xl font-bold text-red-500">{formatMoney(member.totalDebt)}</p></div>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-6">📂 자산 세부 내역</h3>
        
        <div className="space-y-8">
          {groupedAssets && Object.keys(groupedAssets).map((type) => (
            <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                <h4 className="font-bold text-lg text-slate-700">{type}</h4>
                <span className="text-sm text-slate-500">{groupedAssets[type].length}건</span>
              </div>
              <div className="divide-y divide-slate-100">
                {groupedAssets[type].map((item, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex-1 pr-4">
                      {/* 이름 표시 영역 */}
                      <p className="text-slate-900 font-bold text-lg leading-snug break-keep">{item.name}</p>
                      {item.name !== item.type && <p className="text-slate-400 text-sm mt-1">{item.type}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 mt-2 sm:mt-0">
                      <p className={`text-lg font-bold ${item.type.includes("채무") ? "text-red-600" : "text-slate-900"}`}>{item.type.includes("채무") ? "-" : ""}{formatMoney(item.current_value)}</p>
                      {item.change !== 0 && <p className={`text-sm ${item.change > 0 ? "text-red-500" : "text-blue-500"}`}>{item.change > 0 ? "▲" : "▼"} {formatMoney(Math.abs(item.change))} 변동</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
