const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 两个 URL 都加上 rank=CHALLENGER,GRANDMASTER,MASTER
// totalUrl
code = code.replace(
  "&days=3&unit_unique=",
  "&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique="
);

// 但这样会重复 — items URL 已经有一个 replace，totalUrl 也有
// 实际上两个 URL 都是 &days=3&unit_unique= 结尾
// 所以只需要一次替换即可

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");

// 验证
const lines = code.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("tft-explorer-api")) {
    console.log("Line " + (i+1) + ": " + lines[i].trim());
  }
}
