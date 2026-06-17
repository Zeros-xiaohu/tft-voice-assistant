const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 在 "let itemsCache" 后一行加上 heroItemCache 声明
code = code.replace(
  "let itemsCache: any = null; let itemsCacheTs = 0",
  "let itemsCache: any = null; let itemsCacheTs = 0\nlet heroItemCache = new Map<string, {data: any[], ts: number}>()"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - heroItemCache added");
