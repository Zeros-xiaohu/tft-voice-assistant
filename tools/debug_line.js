const fs = require("fs");
let lines = fs.readFileSync("src/app/api/query/route.ts", "utf8").split("\n");
console.log("Line 175: " + lines[174]);
console.log("Line 176: " + lines[175]);
console.log("Line 177: " + lines[176]);
