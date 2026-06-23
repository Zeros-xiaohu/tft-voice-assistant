const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 在 .slice(0, 5) 后加 .sort 按 avg 升序
// 找到 ".slice(0, 5)"
// 后面是 .map(...) 
// 改成 .slice(0, 5).sort((a:any,b:any) => { ... }) ... 但因为 item 还没 stats 不能排序
// 更好的：在 map 之后、return 之前排序

// 替换：const topItems = unit.items ... .map(...) 
// 为：先 map，再 sort by avg

const oldMap = `      const seen = new Set<string>()
      const topItems = unit.items
        .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("FryingPan") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
        .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
        .slice(0, 5)
        .map((i:any) => {`;

const newMap = `      const seen = new Set<string>()
      const allMapped = unit.items
        .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("FryingPan") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
        .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
        .map((i:any) => {`;

code = code.replace(oldMap, newMap);

// 把 return 后面的 ... 闭合改成 sort + slice
code = code.replace(
  `      const displayName = HERO_DISPLAY[heroKey] || heroKey`,
  `      // Sort by avg (ascending = better) and take top 5
      const topItems = allMapped
        .filter((i:any) => i.avg != null)
        .sort((a:any, b:any) => a.avg - b.avg)
        .slice(0, 5)

      const displayName = HERO_DISPLAY[heroKey] || heroKey`
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - sort by avg");
