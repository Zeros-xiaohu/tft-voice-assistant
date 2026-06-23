const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 去掉所有三处的 ThiefsGloves 过滤
code = code.replace(/ThiefsGloves[^)]*/g, (match) => {
  // 完整保留原来模式但去掉 ThiefsGloves 部分
  return match.replace(" && !i.itemName.includes(\"ThiefsGloves\")", "")
              .replace(" && !r.items.includes(\"ThiefsGloves\")", "")
              .replace(" && !r.itemName.includes(\"ThiefsGloves\")", "");
});

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - removed ThiefsGloves filter");
