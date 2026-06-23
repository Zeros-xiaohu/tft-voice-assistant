const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 找 "r is not defined" — 可能是变量名问题
// 之前改的时候可能把变量名弄乱了
// 查 allMapped 中用的变量

const idx = code.indexOf("const allMapped = unit.items");
if (idx >= 0) {
  console.log("allMapped section:\n" + code.substring(idx, idx + 800));
} else {
  console.log("allMapped not found");
  // 找 .map
  const idx2 = code.indexOf("allMapped");
  if (idx2 >= 0) console.log("Found at: " + code.substring(idx2-100, idx2+300));
}
