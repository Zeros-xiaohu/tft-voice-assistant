const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 在返回 JSON 前更新 heroCount 为 explorer 的对局数
// 找到 const heroCount = unit.count
// 后面已经有 total API 调用拿到总对局数了，加一个 heroCount = t

const oldWinBlock = `            heroWin = t > 0 ? +(td.placement_count[0]/t*100).toFixed(1) : 0
            heroTop4Rate = t > 0 ? +((td.placement_count[0]+td.placement_count[1]+td.placement_count[2]+td.placement_count[3])/t*100).toFixed(1) : 0`;

const newWinBlock = `            heroWin = t > 0 ? +(td.placement_count[0]/t*100).toFixed(1) : 0
            heroTop4Rate = t > 0 ? +((td.placement_count[0]+td.placement_count[1]+td.placement_count[2]+td.placement_count[3])/t*100).toFixed(1) : 0
            heroCountTotal = t`;  // use explorer total as hero count

code = code.replace(oldWinBlock, newWinBlock);

// 声明 heroCountTotal 变量
code = code.replace(
  "let heroWin = 0, heroTop4Rate = 0",
  "let heroWin = 0, heroTop4Rate = 0, heroCountTotal = 0"
);

// 在返回数据中用 heroCountTotal 替换 heroCount
code = code.replace(
  "heroCount,",
  "heroCount: heroCountTotal > 0 ? heroCountTotal : heroCount,"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - unified heroCount to explorer total");
