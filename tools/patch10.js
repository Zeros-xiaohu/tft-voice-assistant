const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 在取完 unitData 后加 total API 调用
// 找到: const heroCount = unit.count
// 后面插入 total API 调用来获取 heroWin/herotop4

const insertPoint = `      const heroCount = unit.count

      // 用 explorer API 获取该英雄专属的装备统计数据`;

const newInsert = `      const heroCount = unit.count

      // 用 explorer total API 获取英雄胜率
      let heroWin = 0, heroTop4Rate = 0
      try {
        const totalUrl = \`https://api-hc.metatft.com/tft-explorer-api/total?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=\${unitKey}-1\`
        const totalRes = await fetch(totalUrl)
        if (totalRes.ok) {
          const totalJson = await totalRes.json()
          const td = totalJson.data?.[0]
          if (td?.placement_count) {
            const t = td.placement_count.reduce((a:number,b:number)=>a+b,0)
            heroWin = t > 0 ? +(td.placement_count[0]/t*100).toFixed(1) : 0
            heroTop4Rate = t > 0 ? +((td.placement_count[0]+td.placement_count[1]+td.placement_count[2]+td.placement_count[3])/t*100).toFixed(1) : 0
          }
        }
      } catch(e) {}

      // 用 explorer API 获取该英雄专属的装备统计数据`;

code = code.replace(insertPoint, newInsert);

// 在返回 JSON 里加 heroWin, heroTop4Rate
code = code.replace(
  `          heroAvg,
          heroPick,
          heroCount,`,
  `          heroAvg,
          heroWin,
          heroTop4Rate,
          heroCount,`
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - added heroWin from explorer API");
