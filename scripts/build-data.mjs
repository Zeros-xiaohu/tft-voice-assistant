// 从 raw/tft-zh_cn.json 提取当前赛季（TFTSet17）的装备合成表
// 用法：node scripts/build-data.mjs
// 数据源：Community Dragon (https://raw.communitydragon.org/latest/cdragon/tft/zh_cn.json)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CURRENT_SET_MUTATOR = "TFTSet17";
const CDRAGON_BASE = "https://raw.communitydragon.org/latest/game/";

function toIconUrl(rawPath) {
  if (!rawPath) return "";
  return CDRAGON_BASE + rawPath.toLowerCase().replace(/\.(tex|dds)$/, ".png");
}

function cleanDesc(s) {
  return s
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/@(\w+)@/g, (_, name) => `{${name}}`)
    .replace(/%i:[\w]+%/g, "")
    .trim();
}

console.log("loading raw data...");
const raw = JSON.parse(
  readFileSync(resolve(ROOT, "raw/tft-zh_cn.json"), "utf8")
);

const currentSet = raw.setData.find((s) => s.mutator === CURRENT_SET_MUTATOR);
if (!currentSet) {
  console.error("Set not found: " + CURRENT_SET_MUTATOR);
  process.exit(1);
}
console.log("Set: " + currentSet.name + " number=" + currentSet.number);

const BASIC_ITEM_APIS = [
  "TFT_Item_BFSword",
  "TFT_Item_RecurveBow",
  "TFT_Item_NeedlesslyLargeRod",
  "TFT_Item_TearOfTheGoddess",
  "TFT_Item_ChainVest",
  "TFT_Item_NegatronCloak",
  "TFT_Item_GiantsBelt",
  "TFT_Item_Spatula",
  "TFT_Item_SparringGloves",
  "TFT_Item_FryingPan",
];

const allItems = raw.items || [];
const basicItems = BASIC_ITEM_APIS
  .map((api) => allItems.find((it) => it.apiName === api && it.name && it.name.length > 1))
  .filter(Boolean)
  .map((it) => ({
    apiName: it.apiName,
    name: it.name,
    desc: cleanDesc(it.desc || ""),
    icon: toIconUrl(it.icon),
    effects: it.effects || {},
    unique: !!it.unique,
  }));

console.log("basic items: " + basicItems.length);
basicItems.forEach((it) => console.log("  " + it.apiName + " -> " + it.name));

const basicApiSet = new Set(BASIC_ITEM_APIS);
basicItems.forEach((it) => basicApiSet.add(it.apiName));

const completedRaw = allItems.filter((it) => {
  if (!Array.isArray(it.composition) || it.composition.length !== 2) return false;
  if (!it.composition.every((c) => basicApiSet.has(c))) return false;
  if (!it.name || it.name.includes("@") || it.name.startsWith("tft_item_name_")) return false;
  return true;
});

console.log("completed raw: " + completedRaw.length);

function scoreApiName(api) {
  if (api.startsWith("TFT_Item_") && !api.match(/^TFT\d+_/)) return 3;
  if (api.startsWith("TFT17_")) return 2;
  return 1;
}

const completedByKey = new Map();
for (const it of completedRaw) {
  const key = [...it.composition].sort().join("+");
  const existing = completedByKey.get(key);
  if (!existing) { completedByKey.set(key, it); continue; }
  const itScore = scoreApiName(it.apiName);
  const exScore = scoreApiName(existing.apiName);
  if (itScore > exScore) completedByKey.set(key, it);
  else if (itScore === exScore && it.apiName.length < existing.apiName.length)
    completedByKey.set(key, it);
}

const completedItems = [...completedByKey.values()]
  .filter((it) => !it.apiName.includes("Corrupted"))
  .map((it) => ({
    apiName: it.apiName,
    name: it.name,
    desc: cleanDesc(it.desc || ""),
    icon: toIconUrl(it.icon),
    composition: it.composition || [],
    effects: it.effects || {},
    unique: !!it.unique,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "zh"));

console.log("completed items: " + completedItems.length);

const recipeIndex = {};
for (const item of completedItems) {
  const key = [...item.composition].sort().join("+");
  recipeIndex[key] = { apiName: item.apiName, name: item.name, icon: item.icon };
}

const componentToCompleted = {};
for (const api of BASIC_ITEM_APIS) { componentToCompleted[api] = []; }
for (const item of completedItems) {
  for (const comp of item.composition) {
    if (componentToCompleted[comp]) {
      componentToCompleted[comp].push({
        apiName: item.apiName,
        name: item.name,
        icon: item.icon,
        with: item.composition.find((c) => c !== comp),
      });
    }
  }
}

const outDir = resolve(ROOT, "src/data");
mkdirSync(outDir, { recursive: true });

const output = {
  meta: {
    setName: currentSet.name,
    setNumber: currentSet.number,
    mutator: currentSet.mutator,
    generatedAt: new Date().toISOString(),
  },
  basic: basicItems,
  completed: completedItems,
  recipeIndex,
  componentToCompleted,
};

writeFileSync(
  resolve(outDir, "items.json"),
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log("\nDone! src/data/items.json");
console.log("  basic: " + basicItems.length);
console.log("  completed: " + completedItems.length);
console.log("  recipes: " + Object.keys(recipeIndex).length);