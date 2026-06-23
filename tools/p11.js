const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 添加窃贼手套到 ITEM_NAMES
code = code.replace(
  "EdgeOfNight:\"夜之锋刃\",Evenshroud:\"薄暮法袍\",",
  "EdgeOfNight:\"夜之锋刃\",Evenshroud:\"薄暮法袍\",ThiefsGloves:\"窃贼手套\","
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - added ThiefsGloves to ITEM_NAMES");
