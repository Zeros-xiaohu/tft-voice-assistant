const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");

// 找到英雄统计概览的 div，改 label
code = code.replace(
  `            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">平均排名</p>
              <p className="text-[15px] font-semibold text-accent">{heroAvg}名</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">登场率</p>
              <p className="text-[15px] font-semibold text-textPrimary">{heroPick}%</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">对局数</p>
              <p className="text-[15px] font-semibold text-textPrimary">{(heroCount||0).toLocaleString()}</p>
            </div>`,
  `            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄平均排名</p>
              <p className="text-[15px] font-semibold text-accent">{heroAvg}名</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄登场率</p>
              <p className="text-[15px] font-semibold text-textPrimary">{heroPick}%</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄对局数</p>
              <p className="text-[15px] font-semibold text-textPrimary">{(heroCount||0).toLocaleString()}</p>
            </div>`
);

fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK - added hero prefix");
