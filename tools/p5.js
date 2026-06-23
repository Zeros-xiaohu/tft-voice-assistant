const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");

// 改标题: "{data.heroName} · 推荐装备" → "{data.heroName} · 近三天 · 大师宗师王者 · 大数据"
code = code.replace(
  `<p className="text-[15px] font-medium text-textPrimary">{data.heroName} · 推荐装备</p>`,
  `<p className="text-[15px] font-medium text-textPrimary">{data.heroName} · 近三天 · 大师宗师王者 · 大数据</p>`
);

fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK - updated title");
