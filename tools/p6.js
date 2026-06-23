const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 改回用 unit.items 的顺序（英雄出场率），然后用 explorer stats match
// 替换：从 allMapped (heroItemStats) 直接取 → 改回从 unit.items 取并匹配 stats

const oldBlock = `      // Map all hero items with stats from explorer API
      const allMapped = heroItemStats.map((r:any) => {`;

const newBlock = `      // Use unit_items_processed for item order (hero-specific pick rate),
      // then match with explorer API for hero-specific avg/top4/win stats
      const seen = new Set<string>()
      const allMapped = unit.items
        .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("FryingPan") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
        .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
        .map((i:any) => {`;

code = code.replace(oldBlock, newBlock);

// 更新排序：不排序，保持 unit.items 原始顺序
code = code.replace(
  "const topItems = allMapped\n        .filter((i:any) => i.count > 0)\n        .sort((a:any, b:any) => b.count - a.count)\n        .slice(0, 5)",
  "const topItems = allMapped\n        .filter((i:any) => i.avg != null)\n        .slice(0, 5)"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - use unit.items order + explorer stats");
