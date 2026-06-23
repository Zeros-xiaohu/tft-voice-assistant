const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 修复 map 里的变量: r → i，然后用 heroItemMap 匹配
const brokenMap = `        .map((i:any) => {
        const name = iname(r.itemName)
        const icon = iicon(r.itemName)
        const avgDiff = +(r.avg - baselineAvg).toFixed(2)
        return {
          name, icon,
          avg: r.avg,
          top4: r.top4,
          win: r.win,
          avgDiff,
          count: r.total,
        }`;

const fixedMap = `        .map((i:any) => {
        const name = iname(i.itemName)
        const icon = iicon(i.itemName)
        const stats = heroItemMap.get(i.itemName)
        if (!stats) return { name, icon }
        const avgDiff = +(stats.avg - baselineAvg).toFixed(2)
        return {
          name, icon,
          avg: stats.avg,
          top4: stats.top4,
          win: stats.win,
          avgDiff,
          count: stats.total,
        }`;

code = code.replace(brokenMap, fixedMap);
fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - fixed variable reference");
