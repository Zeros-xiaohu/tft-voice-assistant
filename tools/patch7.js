const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 在 item map return 里加 pickRate
const oldReturn = `          return {
            name, icon,
            avg: stats.avg,
            top4: stats.top4,
            win: stats.win,
            avgLabel: \`平均 \${stats.avg} 名\`,
            avgDiff,
            top4Label: \`前四 \${stats.top4}%\`,
            winLabel: \`吃鸡 \${stats.win}%\`,
            count: stats.total,
          }`;

const newReturn = `          const pickRate = heroCount > 0 ? +((stats.total / heroCount) * 100).toFixed(1) : null
          return {
            name, icon,
            avg: stats.avg,
            top4: stats.top4,
            win: stats.win,
            pickRate,
            avgLabel: \`平均 \${stats.avg} 名\`,
            avgDiff,
            top4Label: \`前四 \${stats.top4}%\`,
            winLabel: \`吃鸡 \${stats.win}%\`,
            count: stats.total,
          }`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - added pickRate");
