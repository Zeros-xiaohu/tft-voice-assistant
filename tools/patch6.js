const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");

const oldSection = `          {/* 装备卡片 — 每件装备一横条 */}
          <p className="text-[12px] text-textSecondary mb-2">推荐装备 (出场率 ↓)</p>
          {data.items?.map((item: any, i: number) => {
            const avgDiff = item.avgDiff
            const diffIcon = avgDiff == null ? null : avgDiff < 0
              ? <TrendingDown className="w-3 h-3 text-green-500" />
              : avgDiff > 0
                ? <TrendingUp className="w-3 h-3 text-red-400" />
                : <Minus className="w-3 h-3 text-textSecondary" />

            return (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-divider last:border-0">
                <span className="text-textSecondary text-[12px] w-4">#{i + 1}</span>
                {item.icon && (
                  <img src={item.icon} alt="" className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-card" loading="lazy"
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <span className="flex-1 text-[14px] text-textPrimary truncate">{item.name}</span>
                <div className="text-right min-w-[70px]">
                  <div className="flex items-center justify-end gap-0.5">
                    {diffIcon}
                    <span className="text-[13px] font-semibold text-accent">{item.avgLabel}</span>
                  </div>
                  {item.top4Label && <span className="text-[10px] text-textSecondary block">{item.top4Label}</span>}
                  {item.winLabel && <span className="text-[10px] text-textSecondary block">{item.winLabel}</span>}
                </div>
              </div>
            )
          })}`;

const newSection = `          {/* 装备表格 — 按平均排名排序 */}
          <p className="text-[12px] text-textSecondary mb-2">推荐装备（按平均排名）</p>
          {/* 表头 */}
          <div className="flex items-center gap-1 text-[10px] text-textSecondary/50 px-1 mb-1">
            <span className="w-5"></span>
            <span className="w-7"></span>
            <span className="flex-1"></span>
            <span className="w-[52px] text-center">平均名次</span>
            <span className="w-10 text-center">前四率</span>
            <span className="w-9 text-center">胜率</span>
            <span className="w-14 text-center">游戏局数</span>
            <span className="w-10 text-center">登场率</span>
          </div>
          {data.items?.map((item: any, i: number) => {
            const avgDiff = item.avgDiff
            const diffColor = avgDiff == null ? "" : avgDiff < 0 ? "text-green-500 font-semibold" : avgDiff > 0 ? "text-red-400" : "text-textSecondary"

            return (
              <div key={i} className="flex items-center gap-1 py-2 border-b border-divider last:border-0 text-[12px]">
                <span className="text-textSecondary/40 w-5 text-right text-[11px]">{i + 1}</span>
                {item.icon && (
                  <img src={item.icon} alt="" className="w-6 h-6 rounded-md bg-white p-0.5 flex-shrink-0" loading="lazy"
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <span className="flex-1 text-[13px] text-textPrimary truncate px-0.5">{item.name}</span>
                <span className={"w-[52px] text-center " + diffColor}>{item.avg != null ? item.avg + "名" : "-"}</span>
                <span className="w-10 text-center text-textSecondary/80">{item.top4 != null ? item.top4 + "%" : "-"}</span>
                <span className="w-9 text-center text-textSecondary/80">{item.win != null ? item.win + "%" : "-"}</span>
                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count/10000).toFixed(0) + "万" : "-"}</span>
                <span className="w-10 text-center text-textSecondary/80">{item.pickRate != null ? item.pickRate + "%" : "-"}</span>
              </div>
            )
          })}`;

if (!code.includes(oldSection)) {
  console.log("OLD SECTION NOT FOUND");
  console.log("Looking for section starting with: " + oldSection.substring(0, 80));
  const idx = code.indexOf("装备卡片");
  if (idx >= 0) console.log("Found at: " + idx + " -> " + code.substring(idx, idx+100));
  process.exit(1);
}

code = code.replace(oldSection, newSection);
fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK - replaced equipment section with table format");
