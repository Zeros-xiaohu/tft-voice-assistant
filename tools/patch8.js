const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");

// 去掉表头的"登场率"列
code = code.replace(
  `            <span className="w-14 text-center">游戏局数</span>
            <span className="w-10 text-center">登场率</span>`,
  `            <span className="w-14 text-center">游戏局数</span>`
);

// 去掉每行的登场率显示
code = code.replace(
  `                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count/10000).toFixed(0) + "万" : "-"}</span>
                <span className="w-10 text-center text-textSecondary/80">{item.pickRate != null ? item.pickRate + "%" : "-"}</span>`,
  `                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count/10000).toFixed(0) + "万" : "-"}</span>`
);

fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK - removed pickRate column");
