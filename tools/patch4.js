const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

code = code.replace(
  "&days=3&unit_unique=",
  "&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique="
);

fs.writeFileSync("src/app/api/query/route.ts", code, "utf8");
console.log("OK - added rank filter");
