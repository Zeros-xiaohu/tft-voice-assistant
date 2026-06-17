const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 问题: 现在取装备列表时先 filter unit.items（来自 unit_items_processed），再 match explorer stats
// 应该: 直接用 explorer stats 按 count 排序取 top 5

// 替换: const allMapped = unit.items.filter(...).map(...)
// 为: 从 heroItemStats 直接取 top 5 by count

const oldMapBlock = `      const seen = new Set<string>()
      const allMapped = unit.items
        .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("FryingPan") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
        .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
        .map((i:any) => {
          const name = iname(i.itemName)
          const icon = iicon(i.itemName)
          const stats = heroItemMap.get(i.itemName)
          if (!stats) return { name, icon }
          const avgDiff = +(stats.avg - baselineAvg).toFixed(2)
          const pickRate = heroCount > 0 ? +((stats.total / heroCount) * 100).toFixed(1) : null
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
          }
        })`;

const newMapBlock = `      // Map all hero items with stats from explorer API
      const allMapped = heroItemStats.map((r:any) => {
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
        }
      })`;

code = code.replace(oldMapBlock, newMapBlock);

// 更新排序: 确保按 count 倒序
code = code.replace(
  "const topItems = allMapped\n        .filter((i:any) => i.avg != null)\n        .sort((a:any, b:any) => b.count - a.count)\n        .slice(0, 5)",
  "const topItems = allMapped\n        .filter((i:any) => i.count > 0)\n        .sort((a:any, b:any) => b.count - a.count)\n        .slice(0, 5)"
);

// 更新 basline 计算 — 用 heroItemStats 本身
// 之前 baselineAvg 计算正常，不变

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - use explorer data directly for item list");
