const fs = require("fs");
let code = fs.readFileSync("src/app/api/query/route.ts", "utf8");

// 取频率 = heroItemMap 里的 count (即 placement_count 求和)
// 这个 count 已经正确了，问题在于之前用 unit.items 排序导致不对
// 现在我们用 heroItemStats (explorer raw) 的数据 count = 频率

// 不过现在代码是从 unit.items 取装备 + heroItemMap 匹配 stats
// count 来自 heroItemMap.get(i.itemName).total 已经是 explorer 的频率

// 确认 count 已经是 explorer 频率 → 那就是对的
// 只需要前端显示即可

// 先让前端恢复"选取次数"列
fs.writeFileSync("src/app/page.tsx", 
  fs.readFileSync("src/app/page.tsx", "utf8")
    .replace('推荐装备（按平均排名）', '推荐装备（按英雄出场率）')
    .replace(
      '<span className="w-9 text-center">胜率</span>',
      '<span className="w-9 text-center">胜率</span>\n            <span className="w-14 text-center">选取次数</span>'
    )
    .replace(
      '<span className="w-9 text-center text-textSecondary/80">{item.win != null ? item.win + "%" : "-"}</span>',
      '<span className="w-9 text-center text-textSecondary/80">{item.win != null ? item.win + "%" : "-"}</span>\n                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count/10000).toFixed(1) + "万" : "-"}</span>'
    ),
  "utf8"
);

console.log("OK - added back 选取次数 column");
