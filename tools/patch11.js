const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");

// 改前端：取 heroWin 替换 heroPick
code = code.replace(
  `      const heroAvg = data.heroAvg
      const heroPick = data.heroPick
      const heroCount = data.heroCount`,
  `      const heroAvg = data.heroAvg
      const heroWin = data.heroWin
      const heroCount = data.heroCount`
);

// 替换英雄登场率为英雄胜率
code = code.replace(
  `            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄登场率</p>
              <p className="text-[15px] font-semibold text-textPrimary">{heroPick}%</p>
            </div>`,
  `            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄胜率</p>
              <p className="text-[15px] font-semibold text-success">{heroWin != null ? heroWin + "%" : "-"}</p>
            </div>`
);

fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK - hero win rate in frontend");
