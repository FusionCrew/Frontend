import React from "react";

type Category = {
  id: string;
  label: string;
};

type MenuItem = {
  id: string;
  label: string;
  price: string;
  badge?: "인기" | "신메뉴";
};

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M14.5 5.5L8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9.5 5.5L16 12l-6.5 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 10.5L12 3l9 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.5V21h11V10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function KioskMenuScreen() {
  const categories: Category[] = [
    { id: "best", label: "베스트 메뉴" },
    { id: "box", label: "버거박스" },
    { id: "twister", label: "버거 트위스터" },
    { id: "rice", label: "치밥" },
    { id: "chicken", label: "치킨" },
  ];

  const [activeCategoryId, setActiveCategoryId] = React.useState("twister");

  // 실제 데이터 연동 전까지는 샘플로 채움 (레이아웃이 목적)
  const items: MenuItem[] = [
    { id: "1", label: "징거타워세트", price: "8,900원", badge: "인기" },
    { id: "2", label: "징거타워박스", price: "10,800원", badge: "인기" },
    { id: "3", label: "더블징거오리지널", price: "6,800원", badge: "신메뉴" },
    { id: "4", label: "더블징거오리지널\n세트", price: "8,800원", badge: "신메뉴" },
    { id: "5", label: "더블징거오리지널", price: "10,700원", badge: "신메뉴" },
    { id: "6", label: "클래식징거", price: "6,700원" },
    { id: "7", label: "클래식징거\n세트", price: "8,700원" },
    { id: "8", label: "클래식징거박스", price: "10,600원" },
    { id: "9", label: "핫크리스피\n통다리", price: "3,900원" },
    { id: "10", label: "갓양념\n통다리", price: "4,200원" },
  ];

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [page, setPage] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(1);

  const syncPager = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const w = el.clientWidth || 1;
    const total = el.scrollWidth || w;
    const pc = Math.max(1, Math.ceil(total / w));
    setPageCount(pc);

    const p = Math.round(el.scrollLeft / w);
    setPage(clamp(p, 0, pc - 1));
  }, []);

  React.useEffect(() => {
    syncPager();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => syncPager();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => syncPager();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [syncPager]);

  const scrollToPage = (nextPage: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const p = clamp(nextPage, 0, pageCount - 1);
    el.scrollTo({ left: p * w, behavior: "smooth" });
  };

  return (
    <div className="relative w-[360px] aspect-[9/16] bg-[#EADDCD] rounded-[28px] overflow-hidden shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      {/* 상단은 실제 프로젝트에서 Live2D/캐릭터 영역으로 교체될 자리 */}
      <div className="absolute inset-x-0 top-0 bottom-[720px]">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_50%_10%,rgba(255,255,255,0.25),transparent_55%),linear-gradient(180deg,rgba(0,0,0,0.06),transparent_40%)]" />
      </div>

      {/* 하단 패널: 이미지 레퍼런스(KFC 키오스크) 스타일 */}
      <div className="absolute inset-x-0 bottom-0 h-[720px] bg-[#CFE7FF]">
        {/* 상단 라인/헤더 */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1C2A3A]">
              <HomeIcon className="w-5 h-5 opacity-70" />
              <span className="text-[15px] opacity-70">처음으로</span>
              <span className="text-[16px] font-semibold ml-3">KFC</span>
            </div>

            <button
              type="button"
              className="w-12 h-12 rounded-full border-2 border-[#C32911] text-[#C32911] bg-white/75 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
              aria-label="음성 주문"
            >
              <MicIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 카테고리 + 메뉴 영역 */}
        <div className="mt-4 px-5">
          <div className="flex gap-4">
            {/* 좌측 카테고리 스택 */}
            <div className="w-[190px]">
              <div className="flex flex-col gap-3">
                {categories.map((c) => {
                  const active = c.id === activeCategoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCategoryId(c.id)}
                      className={`h-[78px] rounded-[18px] text-[16px] font-semibold tracking-[-0.2px] flex items-center justify-center border-2 transition-colors ${
                        active
                          ? "border-[#C32911] text-[#C32911] bg-white/90"
                          : "border-white/60 text-[#1C2A3A] bg-white/55 hover:bg-white/70"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우측 메뉴: 2줄, 가로 스크롤 */}
            <div className="relative flex-1">
              <div className="rounded-[18px] bg-white/55 border border-white/60 p-3">
                <div className="relative">
                  <div
                    ref={scrollerRef}
                    className="overflow-x-auto scroll-smooth pb-3 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div className="grid grid-rows-2 grid-flow-col auto-cols-[168px] gap-x-3 gap-y-3 pr-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="relative h-[176px] rounded-[16px] bg-white/85 border border-black/5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden"
                        >
                          {/* 배지 */}
                          {item.badge && (
                            <div
                              className={`absolute left-2 top-2 px-2 py-1 rounded-md text-[12px] font-bold leading-none shadow ${
                                item.badge === "인기"
                                  ? "bg-[#2E5BFF] text-white"
                                  : "bg-[#F39B23] text-white"
                              }`}
                            >
                              {item.badge}
                            </div>
                          )}

                          {/* 이미지 영역(실제 에셋 연결 전까지는 자리만 잡음) */}
                          <div className="absolute inset-x-0 top-0 h-[112px] flex items-center justify-center">
                            <div className="w-[92px] h-[72px] rounded-xl bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),rgba(0,0,0,0.08))] border border-black/5" />
                          </div>

                          <div className="absolute inset-x-0 bottom-0 px-3 pb-2">
                            <div className="text-[13px] font-semibold text-[#1C2A3A] whitespace-pre-line leading-tight">
                              {item.label}
                            </div>
                            <div className="mt-1 text-[13px] font-bold text-[#2E3A48]">
                              {item.price}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 좌/우 스크롤 버튼 */}
                  <button
                    type="button"
                    aria-label="이전 페이지"
                    onClick={() => scrollToPage(page - 1)}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 border border-black/10 shadow flex items-center justify-center text-[#1C2A3A] hover:bg-white disabled:opacity-40 disabled:hover:bg-white/80"
                    disabled={page <= 0}
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="다음 페이지"
                    onClick={() => scrollToPage(page + 1)}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 border border-black/10 shadow flex items-center justify-center text-[#1C2A3A] hover:bg-white disabled:opacity-40 disabled:hover:bg-white/80"
                    disabled={page >= pageCount - 1}
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* 페이지 도트 */}
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`페이지 ${i + 1}`}
                      onClick={() => scrollToPage(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === page ? "w-6 bg-[#C32911]" : "w-2.5 bg-black/25 hover:bg-black/35"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 주문 요약 바 */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <div className="rounded-[20px] bg-white/70 border border-white/70 shadow-[0_18px_40px_rgba(0,0,0,0.12)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-[14px] font-semibold text-[#1C2A3A]">
                  주문내역
                </div>
                <div className="px-2 py-0.5 rounded-full bg-[#C32911] text-white text-[12px] font-bold">
                  0
                </div>
              </div>

              <button
                type="button"
                className="px-5 h-[44px] rounded-full bg-[#C32911] text-white font-bold shadow-[0_12px_26px_rgba(195,41,17,0.35)]"
              >
                주문하기
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[#1C2A3A]">
              <div className="rounded-xl bg-white/60 border border-black/5 px-3 py-2">
                <div className="text-[12px] opacity-70">주문금액</div>
                <div className="text-[14px] font-bold">0원</div>
              </div>
              <div className="rounded-xl bg-white/60 border border-black/5 px-3 py-2">
                <div className="text-[12px] opacity-70">할인금액</div>
                <div className="text-[14px] font-bold">0원</div>
              </div>
              <div className="rounded-xl bg-white/60 border border-black/5 px-3 py-2">
                <div className="text-[12px] opacity-70">결제금액</div>
                <div className="text-[14px] font-bold">0원</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

