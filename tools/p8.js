const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");

// 去掉表头装备选择数
code = code.replace(
  `            <span className="w-14 text-center">装备选择数</span>`,
  ``
);

// 去掉每行装备选择数
code = code.replace(
  `                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count/10000).toFixed(0) + "万" : "-"}</span>`,
  ``
);

fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK - removed equipment count column");
