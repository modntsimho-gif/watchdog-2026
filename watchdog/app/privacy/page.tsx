export default function PrivacyPage() {
    return (
      <main className="max-w-3xl mx-auto p-6 py-12 text-slate-800">
        <h1 className="text-3xl font-bold mb-8 border-b pb-4">개인정보처리방침</h1>
  
        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2 text-slate-900">1. 개인정보의 처리 목적</h2>
            <p>
              'WatchDog (ni-eolma.com)'(이하 '사이트')은(는) 다음의 목적을 위하여 개인정보를 처리합니다. 
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 
              개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-bold mb-2 text-slate-900">2. 구글 애드센스 (Google AdSense)</h2>
            <p className="mb-2">
              본 사이트는 광고 게재를 위해 Google AdSense를 사용합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                Google을 포함한 제3자 공급업체는 쿠키(Cookie)를 사용하여 사용자가 본 웹사이트나 다른 웹사이트에 과거에 방문한 기록을 바탕으로 광고를 게재합니다.
              </li>
              <li>
                Google은 광고 쿠키를 사용하여 사용자가 본 사이트나 인터넷의 다른 사이트에 방문한 기록을 바탕으로 적절한 광고를 사용자에게 제공할 수 있습니다.
              </li>
              <li>
                사용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="text-blue-600 underline">광고 설정</a>을 방문하여 맞춤 광고를 사용 중지할 수 있습니다.
              </li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-xl font-bold mb-2 text-slate-900">3. 로그 데이터 (Log Data)</h2>
            <p>
              사용자가 본 사이트를 방문할 때, 브라우저가 전송하는 정보(접속 로그, IP 주소, 브라우저 유형, 방문 시간 등)가 
              서버에 자동으로 기록될 수 있습니다. 이는 사이트의 보안 유지 및 서비스 개선을 위한 통계 목적으로만 사용됩니다.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-bold mb-2 text-slate-900">4. 게시된 데이터에 대한 안내</h2>
            <p>
              본 사이트에서 제공하는 국회의원 재산 정보는 대한민국 국회 공직자윤리위원회가 공개한 
              '공직자 재산등록사항 공개 목록' 등의 **공공 데이터**를 기반으로 합니다. 
              이는 공익적 목적으로 제공되는 정보이며, 사이트 방문자의 개인정보와는 무관합니다.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-bold mb-2 text-slate-900">5. 문의처</h2>
            <p>
              본 개인정보처리방침과 관련하여 문의사항이 있으신 경우 아래 연락처로 문의 주시기 바랍니다.
            </p>
            <p className="mt-2 font-semibold">
              이메일: contact@ni-eolma.com (또는 본인의 이메일 주소)
            </p>
          </section>
  
          <div className="pt-8 border-t text-slate-500 text-xs">
            <p>시행일자: 2024년 5월 20일</p>
          </div>
        </div>
      </main>
    );
  }
  