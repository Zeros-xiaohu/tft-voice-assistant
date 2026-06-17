const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// heroCount 后面跟的是 let heroWin 声明但在 try-catch 里
// 问题：heroCount 是 const，但 heroWin 声明在 try 之前没有
// 看看实际代码

// 找到 heroCount 后的代码
const idx = code.indexOf("const heroCount = unit.count");
const snippet = code.substring(idx, idx + 500);
console.log("heroCount context:\n" + snippet);

// 需要确保 heroWin = 0 在 try 外
// 看起来现在声明在 try 外但赋值在 try 外也是 let
// 看看是否真的被 try-catch 包裹

// 应该没问题... 检查一下变量名冲突
const hasHeroWin = code.includes("heroWin = 0");
const hasLetHeroWin = code.includes("let heroWin = 0");
console.log("\nhas 'heroWin = 0': " + hasHeroWin);
console.log("has 'let heroWin = 0': " + hasLetHeroWin);

// 查所有 heroWin 出现位置
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('heroWin')) {
    console.log("Line " + (i+1) + ": " + lines[i].trim());
  }
}
