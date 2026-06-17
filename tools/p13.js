const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// Minimize params to match Explorer defaults exactly
code = code.replace(
  "const expUrl = \`https://api-hc.metatft.com/tft-explorer-api/items?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&unit_unique=\${unitKey}-1\`",
  "const expUrl = \`https://api-hc.metatft.com/tft-explorer-api/items?queue=1100&patch=current&days=3&unit_unique=\${unitKey}-1\`"
);

// 同时 total API 也精简
code = code.replace(
  "const totalUrl = \`https://api-hc.metatft.com/tft-explorer-api/total?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=\${unitKey}-1\`",
  "const totalUrl = \`https://api-hc.metatft.com/tft-explorer-api/total?queue=1100&patch=current&days=3&unit_unique=\${unitKey}-1\`"
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - minimal params");
