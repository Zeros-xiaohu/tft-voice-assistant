const fs = require("fs");
let code = fs.readFileSync("src/app/page.tsx", "utf8");
code = code.replace("游戏局数", "装备选择数");
fs.writeFileSync("src/app/page.tsx", code, "utf8");
console.log("OK1");
