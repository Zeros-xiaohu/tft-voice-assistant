const fs = require("fs");
let code = fs.readFileSync("next.config.js", "utf8");
// 去掉 env 块 — Vercel 用环境变量注入，不需要 next.config 里写
code = code.replace(`,  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
  }`, "");
fs.writeFileSync("next.config.js", code, "utf8");
console.log("OK - removed env block from next.config");
