const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

code = code.replace(
  "td.placement_count.reduce((a,b)=>a+b,0)",
  "td.placement_count.reduce((a:number,b:number)=>a+b,0)"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK");
