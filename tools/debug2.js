const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 直接看 heroCount 附近 300 字符
const idx = code.indexOf("const heroCount = unit.count");
console.log("Around heroCount (50 chars before, 300 after):");
console.log(code.substring(Math.max(0,idx-50), idx + 300));
