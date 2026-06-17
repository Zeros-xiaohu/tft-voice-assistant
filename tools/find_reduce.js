const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 检查所有 reduce 调用
const lines = code.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("reduce")) {
    console.log("Line " + (i+1) + ": " + lines[i].trim());
  }
}
