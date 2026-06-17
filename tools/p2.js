const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");
code = code.replace(
  "sort((a:any, b:any) => a.avg - b.avg)",
  "sort((a:any, b:any) => b.count - a.count)"
);
fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK2");
