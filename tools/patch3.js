const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 在 unitKey 后面加上 "-1"
code = code.replace(
  "const expUrl = \`https://api-hc.metatft.com/tft-explorer-api/items?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&unit_unique=\${unitKey}\`",
  "const expUrl = \`https://api-hc.metatft.com/tft-explorer-api/items?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&unit_unique=\${unitKey}-1\`"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - added -1 suffix");
