"use client"


/* 鈹€鈹€鈹€ API result -> Cards 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
function resultToCards(result: any): Card[] {
  if (!result) return [];
  if (result.type === "item_tier") {
    return [{
      kind: "data", title: "装备强度排行", tab: "综合排名",
      stats: [{ label: "样本局数", value: "120万+", color: "#F0B429" },{ label: "更新", value: "今日" },{ label: "赛季", value: "S17.6" }],
      noteLabel: "平均名次胜率场次",
      rows: (result.data.items?.slice(0,8)||[]).map((item:any,i:number) => ({
        rank:i+1, icon:item.icon?"img:"+item.icon:item.name?.slice(0,2)||"⚔️", name:item.name||"-",
        main:(item.avg??"-")+"名", rest:[(item.top4??"-")+"%"]
      }))
    }];
  }
  if (result.type === "comp_tier") {
    const comps = result.data.comps?.slice(0, 5) || [];
    
    // Build rows: each comp shows name as the row title, with unit icons inline
    const rows = comps.map((c: any, i: number) => {
      // Build icon HTML-like string with first hero icon
      const firstIcon = c.unitIcons?.[0] || "";
      return {
        rank: i + 1,
        icon: firstIcon ? "img:" + firstIcon : "🏆",
        name: c.name || "-",
        main: (c.avg ?? "-") + "名",
        rest: [(c.top4 ?? "-") + "%", (c.win ?? "-") + "%"],
        _unitIcons: c.unitIcons || [],
        _coreUnits: c.coreUnits || [],
        _trait: c.trait || "",
        _playRate: c.playRate || "",
      };
    });
    
    return [{
      kind: "data",
      title: "S级强势阵容 TOP 5",
      tab: "MetaTFT S17.6",
      stats: [
        { label: "数据来源", value: "MetaTFT", color: "#5B6CF9" },
        { label: "段位", value: "全段位", color: "#00C67D" },
        { label: "赛季", value: "S17.6" },
      ],
      noteLabel: "阵容名称 | 平均排名 | 前四率 | 吃鸡率",
      rows,
      _comps: comps,
    }];
  }
    if (result.type === "hero_build") {
    const hd=result.data;
    if (hd.heroName&&hd.items&&hd.items.length>0&&hd.heroAvg!=null) {
      return [{
        kind:"data", title:hd.heroName+" · 最佳装备", tab:"装备推荐",
        stats:[{ label:"平均排名", value:(hd.heroAvg??"-")+"名", color:"#5B6CF9" },{ label:"胜率", value:hd.heroWin!=null?hd.heroWin+"%":"-", color:"#00C67D" },{ label:"对局数", value:(hd.heroCount||0).toLocaleString() }],
        noteLabel:"装备平均排名 | 前四率 | 出场次数",
        rows:(hd.items?.slice(0,6)||[]).map((it:any,i:number)=>({
          rank:i+1, icon:it.icon?"img:"+it.icon:"🗡️", name:it.name||"-",
          main:(it.avg??"-")+"名", rest:[(it.top4??"-")+"%"]
        }))
      }];
    }
    return [{ kind:"analysis", title:"请告诉我英雄名称", tab:"AI 助手", body:"请输入您需要查询的英雄名称，例如：\n· 金克斯装备\n· 男枪出装\n· 剑圣出装" }];
  }
  if (result.type === "item_recipe") {
    return [{
      kind:"data", title:"装备合成方案", tab:"合成推荐",
      stats:[{ label:"散件1", value:result.data.inputItems?.[0]||"-", color:"#F0B429" },{ label:"散件2", value:result.data.inputItems?.[1]||"-", color:"#F0B429" },{ label:"可合成", value:(result.data.recipes?.length||0)+"件" }],
      noteLabel:"装备名称 | 平均排名 | 合成配方 | 前四率",
      rows:(result.data.recipes?.slice(0,6)||[]).map((r:any,i:number)=>({
        rank:i+1, icon:r.icon?"img:"+r.icon:"🗡️", name:r.name||"-",
        main:(r.avg??"-")+"名", rest:[(r.from?.[0]||"")+"+"+(r.from?.[1]||""), (r.top4??"-")+"%"]
      }))
    }];
  }
  return [{ kind:"analysis", title:"提示", tab:"AI", body:"试试以下查询：\n· 装备排行\n· 最强阵容\n· 金克斯装备\n· 反曲弓和大剑能合什么" }];
}

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Mic } from "lucide-react";

type View = "home" | "battle";

/* ─── CSS keyframes injected once ───────────────────────────── */
const STYLES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideOutRight {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(100%); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-100%); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes fadeOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.92); }
}
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.7; }
  70%  { transform: scale(1.9); opacity: 0; }
  100% { transform: scale(1.9); opacity: 0; }
}
.anim-fade-slide-up  { animation: fadeSlideUp 0.32s ease both; }
.anim-slide-in-right { animation: slideInRight 0.3s cubic-bezier(.32,.72,0,1) both; }
.anim-slide-out-right{ animation: slideOutRight 0.28s cubic-bezier(.32,.72,0,1) both; }
.anim-slide-in-left  { animation: slideInLeft 0.3s cubic-bezier(.32,.72,0,1) both; }
.anim-fade-in        { animation: fadeIn 0.2s ease both; }
.anim-fade-out       { animation: fadeOut 0.18s ease both; }
.pulse-ring::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: #7B5CF6;
  animation: pulse-ring 1.2s cubic-bezier(0.215,0.61,0.355,1) infinite;
}
`;

/* ─── types ─────────────────────────────────────────────────── */
interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: Card[];
}
interface Card {
  kind: "data" | "analysis";
  title: string;
  tab: string;
  stats?: { label: string; value: string; color?: string }[];
  noteLabel?: string;
  rows?: { rank: number; icon: string; name: string; main: string; rest: string[]; _coreUnits?: string[]; _unitIcons?: string[]; _coreItems?: Record<string,string[]>; _trait?: string; _howToPlay?: string; _recommendedAugments?: string[]; _difficulty?: string; _top4?: number; _win?: number; _avg?: number }[];
  tags?: string[];
  body?: string;
  _comps?: any[];
}

/* ─── mock data ────────────────────────────────────

/* ─── hex bg ─────────────────────────────────────────────────── */
function HexBg() {
  const shapes = [
    { cx: 320, cy: 30,  r: 72 },
    { cx: 260, cy: 110, r: 55 },
    { cx: 370, cy: 120, r: 44 },
    { cx: 50,  cy: 20,  r: 50 },
    { cx: 10,  cy: 100, r: 38 },
    { cx: 160, cy: 60,  r: 30 },
  ];
  function pts(cx: number, cy: number, r: number) {
    return Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
  }
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 390 200" preserveAspectRatio="xMidYMid slice">
      {shapes.map((s, i) => (
        <polygon key={i} points={pts(s.cx, s.cy, s.r)}
          fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      ))}
    </svg>
  );
}

/* ─── stars ──────────────────────────────────────────────────── */
function Stars() {
  return (
    <span className="flex gap-0.5 items-center">
      {[0,1,2].map(i => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F0B429">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

/* ─── card header ────────────────────────────────────────────── */
function CardHeader({ title, tab }: { title: string; tab: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ background: "#1E1A4E", borderLeft: "4px solid #F0B429", borderRadius: "12px 12px 0 0" }}>
      <span className="text-white font-bold text-[13px] leading-snug flex-1 mr-2">{title}</span>
      <span className="text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium flex-shrink-0"
        style={{ background: "rgba(139,122,255,0.25)", color: "#C4B5FD" }}>
        {tab}
      </span>
    </div>
  );
}

/* ─── animated card wrapper ──────────────────────────────────── */
function AnimCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="anim-fade-slide-up" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function DataCard({ card }: { card: Card }) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "#fff", boxShadow: "0 2px 12px rgba(30,26,78,0.08)" }}>
      <CardHeader title={card.title} tab={card.tab} />
      <div className="px-4 pt-4 pb-4">
        {card.stats && (
          <div className="grid grid-cols-3 gap-1 mb-4">
            {card.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
                <p className="text-xl font-extrabold leading-none" style={{ color: s.color ?? "#111" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
        {card.noteLabel && (
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-[10px] text-gray-400 w-3 text-center flex-shrink-0">#</span>
              <span className="w-7 flex-shrink-0"></span>
              <span className="flex-1 text-[10px] text-gray-400 font-medium">名称</span>
              <span className="text-[10px] text-gray-400 w-14 text-right flex-shrink-0">排名</span>
              {(card.noteLabel||"").split("|").slice(2).map((h,i) => <span key={i} className="text-[10px] text-gray-400 w-10 text-right flex-shrink-0">{h.trim()}</span>)}
            </div>
          )}
        {card.rows && (
          <div className="space-y-3">
            {card.rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-[11px] text-gray-400 w-3 text-center flex-shrink-0">{row.rank}</span>
                <span className="w-7 h-7 rounded-md flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#1E1A4E,#312E81)" }}>
                  {typeof row.icon==="string"&&row.icon.startsWith("img:")?<img src={row.icon.slice(4)} alt="" className="w-7 h-7 rounded object-cover" onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none"}}/>:row.icon}
                </span>
                <span className="flex-1 text-[13px] font-medium text-gray-800 min-w-0 truncate">{row.name}</span>
                <span className="text-[13px] font-bold w-14 text-right flex-shrink-0" style={{ color: "#00C67D" }}>
                  {row.main}
                </span>
                {row.rest.map((v, j) => (
                  <span key={j} className="text-[12px] text-gray-400 w-10 text-right flex-shrink-0">{v}</span>
                ))}
              {row._unitIcons && row._unitIcons.length > 0 && (
                <div className="flex gap-1 mt-1 ml-[52px] flex-wrap">
                  {row._unitIcons.filter(Boolean).slice(0, 5).map((icon: string, ui: number) => (
                    <img key={ui} src={icon} alt="" className="w-6 h-6 rounded bg-purple-50 p-0.5" onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none"}} />
                  ))}
                </div>
              )}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisCard({ card }: { card: Card }) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "#fff", boxShadow: "0 2px 12px rgba(30,26,78,0.08)" }}>
      <CardHeader title={card.title} tab={card.tab} />
      <div className="px-4 pt-3 pb-4">
        {card.tags && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {card.tags.map((t, i) => (
              <span key={i} className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{ background: "#EEEEFF", color: "#6B5CF6" }}>{t}</span>
            ))}
          </div>
        )}
        {card.body && (
          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{card.body}</p>
        )}
      </div>
    </div>
  );
}

/* ─── empty state ────────────────────────────────────────────── */
const GUIDE_CARDS = [
  { icon: "⚔️", q: "最强阵容",  label: "本版本 T0 阵容推荐", hint: "查看当前强势阵容排名" },
  { icon: "🎒", q: "装备排行",  label: "装备强度排行榜",     hint: "哪些装备最值得拿" },
  { icon: "🔆", q: "英雄最佳出装", label: "英雄最佳装备", hint: "查询英雄推荐出装（输入英雄名）" },
];

function EmptyState({ onSend }: { onSend: (q: string) => void }) {
  return (
    <div className="mt-2 anim-fade-slide-up">
      <p className="text-[13px] text-gray-500 mb-4">
        欢迎使用对战模式！试试下面这些查询 👇
      </p>
      <GuideBar onSend={onSend} />
    </div>
  );
}

function GuideBar({ onSend }: { onSend: (q: string) => void }) {
  return (
    <div className="space-y-2.5 anim-fade-slide-up">
      {GUIDE_CARDS.map((c, i) => (
        <button key={i} onClick={() => onSend(c.q)}
          className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
          style={{
            background: "#fff",
            border: "1px solid #EEEEF8",
            boxShadow: "0 1px 6px rgba(30,26,78,0.06)",
          }}>
          <span className="text-xl w-8 text-center flex-shrink-0">{c.icon}</span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-800">{c.label}</p>
            <p className="text-[11px] text-gray-400">{c.hint}</p>
          </div>
          <span className="ml-auto text-gray-300 text-lg">›</span>
        </button>
      ))}
    </div>
  );
}
/* ─── Battle mode ────────────────────────────────────────────── */
function BattleMode({ onBack }: { onBack: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  const send = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setMsgs(p => [...p, { id: Date.now()+"", role: "user", text: q }]);
    setInput("");
    setTyping(true);

    // 最强阵容 —— 直接使用假数据，不走 API
    if (q === "最强阵容" || q.includes("阵容") || q.toLowerCase().includes("t0")) {
      const mockCards: Card[] = [{
        kind: "data",
        title: "S17.6 强势阵容 TOP 5",
        tab: "当前版本",
        stats: [
          { label: "数据版本", value: "S17.6", color: "#7B5CF6" },
          { label: "段位", value: "大师+", color: "#F0B429" },
          { label: "更新时间", value: `${new Date().getMonth()+1}月${new Date().getDate()}日`, color: "#00C67D" },
        ],
        noteLabel: "阵容名称 | 平均排名 | 前四率 | 吃鸡率",
        rows: [
          { rank: 1, icon: "🥇", name: "太空律动奥恩", main: "3.89 名", rest: ["59.2%", "19.2%"], _coreUnits: ["奥恩", "娜美", "塔姆", "慎", "永恩"] },
          { rank: 2, icon: "🥈", name: "太空律动娜美", main: "4.10 名", rest: ["57.8%", "16.3%"], _coreUnits: ["娜美", "奥恩", "璐璐", "塔姆", "迦娜"] },
          { rank: 3, icon: "🥉", name: "暗星转龙王", main: "4.17 名", rest: ["56.9%", "12.3%"], _coreUnits: ["龙王", "泽拉斯", "赛娜", "慎", "莫甘娜"] },
          { rank: 4, icon: "4", name: "海魔人大悲", main: "4.26 名", rest: ["56.2%", "7.5%"], _coreUnits: ["大悲", "海魔人", "瑟庄妮", "布隆", "亚托克斯"] },
          { rank: 5, icon: "5", name: "暗星大虫子", main: "4.28 名", rest: ["54.1%", "15.1%"], _coreUnits: ["科加斯", "赛娜", "莫甘娜", "慎", "泽拉斯"] },
        ],
        _comps: [
          { name: "太空律动奥恩", avg: 3.89, top4: 59.2, win: 19.2, difficulty: "高", coreUnits: ["奥恩", "娜美", "塔姆", "慎", "永恩"], trait: "太空律动", playRate: "16.8%", coreItems: { "奥恩": ["狂徒铠甲", "巨龙之爪", "石像鬼石板甲"], "永恩": ["鬼索的狂暴之刃", "无尽的饥饿感", "泰坦的坚决"] }, recommendedAugments: ["太空律动之徽", "潘多拉装备", "耐久训练"], howToPlay: "前期用3太空律动过渡，攒经济上7级找奥恩和永恩，给奥恩纯肉装站前排，永恩堆攻速和吸血。" },
          { name: "太空律动娜美", avg: 4.10, top4: 57.8, win: 16.3, difficulty: "中", coreUnits: ["娜美", "奥恩", "璐璐", "塔姆", "迦娜"], trait: "太空律动", playRate: "14.5%", coreItems: { "娜美": ["蓝霸符", "珠光护手", "大天使之杖"], "奥恩": ["狂徒铠甲", "石像鬼石板甲"] }, recommendedAugments: ["太空律动之徽", "蓝电池", "珠光莲花"], howToPlay: "前期用3法师+2护卫过渡，7级找娜美和奥恩，优先给娜美蓝量和法强装备，奥恩做前排肉装。" },
          { name: "暗星转龙王", avg: 4.17, top4: 56.9, win: 12.3, difficulty: "中", coreUnits: ["龙王", "泽拉斯", "赛娜", "慎", "莫甘娜"], trait: "暗星", playRate: "12.8%", coreItems: { "龙王": ["蓝霸符", "珠光护手", "大天使之杖"], "慎": ["狂徒铠甲", "巨龙之爪"] }, recommendedAugments: ["暗星之徽", "蓝电池", "珠光莲花"], howToPlay: "前期用3暗星+2法师过渡，7级找龙王和泽拉斯，优先给龙王蓝量和法强装备，慎做前排肉装。" },
          { name: "海魔人大悲", avg: 4.26, top4: 56.2, win: 7.5, difficulty: "高", coreUnits: ["大悲", "海魔人", "瑟庄妮", "布隆", "亚托克斯"], trait: "海魔人", playRate: "10.2%", coreItems: { "大悲": ["鬼索的狂暴之刃", "无尽的饥饿感", "水银"], "瑟庄妮": ["狂徒铠甲", "离子火花"] }, recommendedAugments: ["海魔人之徽", "鬼索的狂暴之刃", "耐久训练"], howToPlay: "前期用3海魔人+2斗士过渡，7级找大悲和海魔人，给大悲攻速装和保命装，瑟庄妮做前排肉装。" },
          { name: "暗星大虫子", avg: 4.28, top4: 54.1, win: 15.1, difficulty: "中", coreUnits: ["科加斯", "赛娜", "莫甘娜", "慎", "泽拉斯"], trait: "暗星", playRate: "9.8%", coreItems: { "科加斯": ["狂徒铠甲", "荆刺背心", "巨龙之爪"], "赛娜": ["鬼索的狂暴之刃", "最后的轻语"] }, recommendedAugments: ["暗星之徽", "潘多拉装备", "巨人杀手"], howToPlay: "前期用3暗星+2护卫过渡，6级D出三星科加斯，给科加斯纯肉装，赛娜做物理输出装。" },
        ],
      }];

      setTimeout(() => {
        setMsgs(p => [...p, { id: (Date.now()+1)+"", role: "assistant", text: "", cards: mockCards }]);
        setTyping(false);
      }, 600);
      return;
    }
    const vagueHero = ["英雄最佳出装","英雄装备","英雄出装","英雄配装","英雄推荐","最佳装备","最好装备"];
    if (vagueHero.some(p => q.includes(p)) && q.length < 10 && !q.includes("金克斯") && !q.includes("亚索") && !q.includes("易大师")) {
      setMsgs(p => [...p, { id: (Date.now()+1)+"", role: "assistant", text: "", cards: [{ kind: "analysis", title: "请告诉我英雄名称", tab: "AI 助手", body: "请输入您需要查询的英雄名称，例如：\n· 金克斯装备\n· 男枪出装\n· 剑圣出装" }] }]);
      setTyping(false);
      return;
    }
    try {
      const res = await fetch("/api/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      const cards = resultToCards(data);
      setMsgs(p => [...p, { id: (Date.now()+1)+"", role: "assistant", text: "", cards }]);
    } catch {
      setMsgs(p => [...p, { id: (Date.now()+1)+"", role: "assistant", text: "", cards: [{ kind: "analysis", title: "网络开小差了", tab: "错误", tags: ["网络故障"], body: "请检查网络连接后重试。" }] }]);
    }
    setTyping(false);
  }, []);

  function toggleMic() {
    if (listening) { setListening(false); return; }
    setListening(true);
    setTimeout(() => { setListening(false); send("装备排行"); }, 2000);
  }

  
  return (
    <div className="flex flex-col h-dvh anim-slide-in-right" style={{ background: "#EBEBF5" }}>
      {/* header */}
      <div className="relative flex-shrink-0 px-4 pt-10 pb-5 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#100D30 0%,#1E1A6E 100%)" }}>
        <HexBg />
        <div className="relative flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-extrabold text-white leading-tight">对战模式</h1>
            <p className="text-[12px]" style={{ color: "#A89EE8" }}>战前研究助手</p>
          </div>
          <Stars />
        </div>
      </div>

                  {/* chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 快捷按钮始终显示在最前面，不消失 */}
        <div className="space-y-2.5 anim-fade-slide-up">
          {GUIDE_CARDS.map((c, i) => (
            <button key={i} onClick={() => send(c.q)}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
              style={{
                background: "#fff",
                border: "1px solid #EEEEF8",
                boxShadow: "0 1px 6px rgba(30,26,78,0.06)",
              }}>
              <span className="text-xl w-8 text-center flex-shrink-0">{c.icon}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800">{c.label}</p>
                <p className="text-[11px] text-gray-400">{c.hint}</p>
              </div>
              <span className="ml-auto text-gray-300 text-lg">›</span>
            </button>
          ))}
        </div>

        {msgs.length === 0 && (
          <p className="text-[13px] text-gray-400 mt-1 anim-fade-slide-up">👆 点击上面按钮开始查询或告诉我你想要查询什么呢？</p>
        )}

        {msgs.map((m, mi) => (
          <div key={m.id}>
            {m.role === "user" ? (
              <div className="flex justify-end anim-fade-slide-up">
                <div className="px-5 py-2.5 rounded-2xl text-[14px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#7B5CF6,#9B6BF6)" }}>
                  {m.text}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {m.cards?.map((c, i) => (
                  <AnimCard key={i} delay={i * 80}>
                    {c.kind === "data"
                      ? <DataCard card={c} />
                      : <AnalysisCard card={c} />}
                  </AnimCard>
                ))}
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div className="flex anim-fade-slide-up">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce"
                    style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
{/* bottom */}
      <div className="flex-shrink-0 bg-white px-4 pt-3 pb-8">
        

        {/* input with mic pulse */}
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 border transition-colors"
          style={{ borderColor: listening ? "#7B5CF6" : "#E8E8F0", background: "#FAFAFA" }}>
          <input
            type="text"
            value={listening ? "正在聆听..." : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
            readOnly={listening}
            placeholder="输入查询，或点击麦克风说话"
            className="flex-1 bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none"
          />
          <button onClick={toggleMic}
            className={`relative flex-shrink-0 ml-1 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${listening ? "pulse-ring" : ""}`}
            style={{ background: listening ? "#7B5CF6" : "transparent" }}>
            <Mic size={16} color={listening ? "#fff" : "#AAAABC"} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────────────── */
function ComingSoonToast({ onClose }: { onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setLeaving(true), 1200);
    return () => clearTimeout(hide);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const remove = setTimeout(onClose, 180);
    return () => clearTimeout(remove);
  }, [leaving, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-10 pointer-events-none">
      <div className={leaving ? "anim-fade-out" : "anim-fade-in"}
        style={{ display: "flex", flexDirection: "column", alignItems: "center",
          gap: 12, padding: "20px 36px", borderRadius: 20,
          background: "#1E1C1E", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
        <span style={{ fontSize: 32 }}>🍗</span>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, lineHeight: 1.5 }}>吃鸡模式即将在</p>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, lineHeight: 1.5 }}>v2.1 上线</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Home page ──────────────────────────────────────────────── */
function HomePage({ onEnterBattle }: { onEnterBattle: () => void }) {
  const [showToast, setShowToast] = useState(false);

  return (
    <div className="flex flex-col h-dvh anim-slide-in-left" style={{ background: "#EBEBF5" }}>
      {/* dark header */}
      <div className="relative flex-shrink-0 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#100D30 0%,#1E1A6E 100%)", minHeight: 220 }}>
        <HexBg />
        <div className="relative px-5 pt-14">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-bold tracking-widest" style={{ color: "#F0B429" }}>
              ✦ TFT · POWERED BY DEEPSEEK
            </p>
            <div className="flex flex-col gap-1.5 items-end">
              {[
                { label: "装备", bg: "#A07010", icon: "🎯" },
                { label: "阵容", bg: "#1C3A72", icon: "🛡" },
                { label: "海克斯", bg: "#4B2F8A", icon: "⚡" },
              ].map(r => (
                <span key={r.label}
                  className="flex items-center gap-1 text-white text-[11px] font-semibold px-3 py-1 rounded-full min-w-[68px]"
                  style={{ background: r.bg }}>
                  <span className="text-[10px]">{r.icon}</span>{r.label}
                </span>
              ))}
            </div>
          </div>
          <h1 className="text-[36px] font-black text-white leading-tight mb-1">云顶语音助手</h1>
          <p className="text-[13px] mb-5" style={{ color: "#A89EE8" }}>语音查数据 · AI 决策建议 · 无需安装</p>
          <div className="flex justify-end gap-3 pb-6">
            {["🎯","🏹","🔮"].map((e, i) => (
              <div key={i} className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)" }}>
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* white card sheet */}
      <div className="relative -mt-5 flex-1 px-4 pt-5 pb-10 rounded-t-3xl"
        style={{ background: "#FFFFFF", boxShadow: "0 -4px 20px rgba(30,26,78,0.10)" }}>

        <button onClick={onEnterBattle}
          className="w-full text-left mb-4 rounded-2xl p-5 active:scale-[0.98] transition-transform"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 12px rgba(30,26,78,0.08)", border: "1px solid #EEEEF8" }}>
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0">
                <polygon points="28,3 51,15.5 51,40.5 28,53 5,40.5 5,15.5" fill="#EEEEFF" stroke="#C4B5FD" strokeWidth="1.5"/>
              </svg>
              <span className="relative text-2xl z-10">🏆</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[17px] font-bold text-gray-900">对战模式</span>
                <Stars />
              </div>
              <p className="text-[12px] text-gray-400 mb-3">版本强势阵容 · 装备排行 · 英雄配装</p>
              <div className="flex flex-wrap gap-2">
                {["阵容推荐","装备排行","英雄配装","装备合成"].map(t => (
                  <span key={t} className="text-[11px] text-gray-500 px-2.5 py-1 rounded-full"
                    style={{ background: "#F3F3FA" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </button>

        <button onClick={() => setShowToast(true)}
          className="w-full text-left rounded-2xl p-5 active:scale-[0.98] transition-transform"
          style={{ background: "#F8F8FC", border: "1px solid #EEEEF8" }}>
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0">
                <polygon points="28,3 51,15.5 51,40.5 28,53 5,40.5 5,15.5" fill="#F0F0F8" stroke="#DDDDF0" strokeWidth="1.5"/>
              </svg>
              <span className="relative text-2xl z-10">🍗</span>
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-bold mb-1" style={{ color: "#AAAABC" }}>吃鸡模式</p>
              <p className="text-[12px] mb-3" style={{ color: "#AAAABC" }}>实时对局追踪 · AI 决策建议</p>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ background: "#FEF3C7", color: "#D97706" }}>即将上线</span>
            </div>
          </div>
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-auto pt-10 pb-4">
          <svg width="13" height="13" viewBox="0 0 13 13">
            <polygon points="6.5,0.5 12,3.5 12,9.5 6.5,12.5 1,9.5 1,3.5" fill="#C89B3C"/>
          </svg>
          <span className="text-[11px]" style={{ color: "#AAAABC" }}>MetaTFT & DeepSeek</span>
        </div>
      </div>

      {showToast && <ComingSoonToast onClose={() => setShowToast(false)} />}
    </div>
  );
}

/* ─── root with view transition ─────────────────────────────── */
export default function App() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="flex flex-col h-full max-w-sm mx-auto overflow-hidden"
      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      {view === "home"
        ? <HomePage onEnterBattle={() => setView("battle")} />
        : <BattleMode onBack={() => setView("home")} />}
    </div>
  );
}
