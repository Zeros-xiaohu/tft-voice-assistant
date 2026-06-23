const fs = require("fs");
let code = fs.readFileSync("next.config.js", "utf8");
code = code.replace('output: "standalone",', '// output: "standalone",');
fs.writeFileSync("next.config.js", code, "utf8");
console.log("OK - removed standalone output");
