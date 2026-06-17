const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 第 175 行: reduce((a,b)=>a+b,0) → reduce((a:number,b:number)=>a+b,0)
// 找所有 reduce 调用
code = code.replace(
  ".reduce((a,b)=>a+b,0)",
  ".reduce((a:number,b:number)=>a+b,0)"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - added type annotations");
