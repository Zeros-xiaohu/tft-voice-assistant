const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 精确替换: heroCount 行后面插入 total API 调用
const oldLine = `      const heroCount = unit.count

      // Use explorer API for hero-specific item stats`;

const newBlock = `      const heroCount = unit.count

      // Get hero win/top4 rate from explorer total API
      let heroWin = 0, heroTop4Rate = 0
      try {
        const totalUrl = \`https://api-hc.metatft.com/tft-explorer-api/total?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=\${unitKey}-1\`
        const totalRes = await fetch(totalUrl)
        if (totalRes.ok) {
          const totalJson = await totalRes.json()
          const td = totalJson.data?.[0]
          if (td?.placement_count) {
            const t = td.placement_count.reduce((a,b)=>a+b,0)
            heroWin = t > 0 ? +(td.placement_count[0]/t*100).toFixed(1) : 0
            heroTop4Rate = t > 0 ? +((td.placement_count[0]+td.placement_count[1]+td.placement_count[2]+td.placement_count[3])/t*100).toFixed(1) : 0
          }
        }
      } catch(e) {}

      // Use explorer API for hero-specific item stats`;

if (code.includes(oldLine)) {
  code = code.replace(oldLine, newBlock);
  console.log("OK - matched and replaced");
} else {
  console.log("No match found for oldLine");
  // 打印相关上下文帮助调试
  const idx = code.indexOf("heroCount = unit.count");
  console.log("Context at idx:", code.substring(idx, idx+100));
}

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
