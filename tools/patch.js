const fs = require("fs");
const code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 找到 hero_build if 块的位置，用 explorer API 替换
const startMarker = "if (intent.intent === \"hero_build\" && intent.hero) {";
const endMarker = "return Response.json({ type:\"unknown\", message:\"试试说「金克斯装备」或「装备排行」\" })";

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log("Cannot find markers");
  process.exit(1);
}

const newBranch = `if (intent.intent === "hero_build" && intent.hero) {
      const [unitData] = await Promise.all([getUnitData()])

      const heroKey = intent.hero
      let unitKey = ""
      for (const [ukey] of Object.entries(unitData.units)) {
        if (ukey.toLowerCase().includes(heroKey.toLowerCase())) { unitKey = ukey; break }
      }
      if (!unitKey) return Response.json({ type:"unknown",message:\`没找到 \${heroKey} 的装备数据\` })

      const unit = unitData.units[unitKey]
      if (!unit?.items) return Response.json({ type:"unknown",message:"暂无该英雄的装备数据" })

      const heroAvg = +unit.avg.toFixed(2)
      const heroPick = +(unit.pick*100).toFixed(1)
      const heroCount = unit.count

      // Use explorer API for hero-specific item stats
      let heroItemStats: any[] = []
      const cacheKey = \`hero_items_\${unitKey}\`
      const cached = heroItemCache.get(cacheKey)
      if (cached && Date.now() - cached.ts < 300_000) {
        heroItemStats = cached.data
      } else {
        try {
          const expUrl = \`https://api-hc.metatft.com/tft-explorer-api/items?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&unit_unique=\${unitKey}\`
          const expRes = await fetch(expUrl)
          if (expRes.ok) {
            const expJson = await expRes.json()
            heroItemStats = (expJson.data || []).filter((r:any) =>
              r.items && r.items.startsWith("TFT_Item_") &&
              !r.items.includes("Artifact") && !r.items.includes("Emblem") &&
              !r.items.includes("_Radiant") && !r.items.includes("Consumable") &&
              !r.items.includes("Spatula") && !r.items.includes("FryingPan") &&
              !r.items.includes("ForceOfNature") && !r.items.includes("ThiefsGloves") &&
              !r.items.includes("AnimaSquad")
            ).map((r:any) => {
              const stats = calcStats(r.placement_count)
              return { itemName: r.items, ...stats }
            })
            heroItemCache.set(cacheKey, { data: heroItemStats, ts: Date.now() })
          }
        } catch(e) {}
      }

      const heroItemMap = new Map<string, {avg:number,top4:number,win:number,total:number}>()
      for (const r of heroItemStats) heroItemMap.set(r.itemName, r)

      const allHeroItems = heroItemStats.filter((r:any) => r.total > 100)
      let bTotal = 0, bAvg = 0
      for (const r of allHeroItems) { bTotal += r.total; bAvg += r.avg * r.total }
      const baselineAvg = bTotal > 0 ? +(bAvg/bTotal).toFixed(2) : 0

      const seen = new Set<string>()
      const topItems = unit.items
        .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("FryingPan") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
        .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
        .slice(0, 5)
        .map((i:any) => {
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
            avgLabel: \`平均 \${stats.avg} 名\`,
            avgDiff,
            top4Label: \`前四 \${stats.top4}%\`,
            winLabel: \`吃鸡 \${stats.win}%\`,
            count: stats.total,
          }
        })

      const displayName = HERO_DISPLAY[heroKey] || heroKey
      return Response.json({
        type:"hero_build",
        data: {
          heroName: displayName,
          heroAvg,
          heroPick,
          heroCount,
          items: topItems,
          tip: \`登场率 \${heroPick}% | 平均 \${heroAvg} 名 | 对局 \${(heroCount||0).toLocaleString()}\`,
        }
      })
    }

`;

const result = code.substring(0, startIdx) + newBranch + code.substring(endIdx);
fs.writeFileSync("src/app/api/query/route.ts", result, "utf8");
console.log("OK");
