const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 去掉 rank 过滤 — 和 Explorer 默认保持一致
code = code.replace("&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=", "&unit_unique=");

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - removed rank filter, match Explorer defaults");
