/**
 * v2.1 吃鸡模式 — 评测脚本
 * 
 * 测试 State Parser / Function Call / End-to-End 的准确性。
 * 完全独立运行，直接调用 DeepSeek API。
 * 
 * 用法: $env:DEEPSEEK_API_KEY="sk-xxx"; node tests/eval.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const DS_API = 'https://api.deepseek.com/chat/completions';
const DS_KEY = process.env.DEEPSEEK_API_KEY || '';

if (!DS_KEY) {
  console.error('ERROR: DEEPSEEK_API_KEY not set in environment');
  process.exit(1);
}

// Load test cases
const testCases = JSON.parse(readFileSync('outputs/v2.1/agent-eval.json', 'utf-8'));

// ─── State Parser Prompt ───
const STATE_PARSER_SYSTEM = `你是云顶之弈局面解析器。你的唯一任务是将用户的自然语言输入转换为结构化的 JSON 数据。

## 规则
1. 只输出 JSON，不要输出任何其他文字。
2. 用户未提及的字段返回 null（不是空字符串，不是空数组）。
3. 如果某个字段用户提到了但你不确定，返回 null。

## 输出格式
{
  "round": "3-2" | null,
  "equipment": [
    { "name": "反曲弓", "type": "basic" },
    { "name": "巨人杀手", "type": "completed" }
  ],
  "augments": ["战士之心"] | [],
  "board": [
    { "name": "德莱厄斯", "star": 2 }
  ] | [],
  "health": 72 | null,
  "gold": 45 | null,
  "preference": "reroll" | "standard" | "fast9" | "any" | null,
  "targetComp": "诅咒战士" | null
}

## 装备分类规则
装备分两类，需要在 type 字段中标注：

**散件 (type: "basic")** — 只有这 9 种：
反曲弓、暴风大剑、无用大棒、女神之泪、锁子甲、负极斗篷、巨人腰带、金铲铲、拳套

**成品 (type: "completed")** — 由散件合成的装备（所有不是散件的都是成品）

如果用户说的是成品装备，type="completed"。
如果用户说的是散件，type="basic"。
如果你无法判断是散件还是成品，默认为 type="basic"。

## 海克斯选择 vs 已选择规则
"正在选择": 用户还没做决定，在问"选哪个" → augments 返回空数组 []
"已选择": 用户明确说选了某个海克斯 → augments 包含该海克斯名
如果无法判断用户是"正在选择"还是"已选择"，默认返回空数组 []。

## preference 识别
- "想玩赌狗" / "赌狗" / "玩低费" → "reroll"
- "正常玩" / "运营" / "打运营" → "standard"
- "想上9" / "95" / "玩高费" / "速9" / "上9阵容" → "fast9"
- "随缘" / "随便" / "看发牌员" → "any"
- 未提及 → null

## 英雄星级
- "2星诺手" → { name: "德莱厄斯", star: 2 }
- "德莱文差一张2星" → { name: "德莱文", star: 1 }
- "德莱文"（未提星级）→ { name: "德莱文", star: 1 }
- "XXX已经3星了" → star: 3

## 回合识别
- "我3-2" / "3-2了" → "3-2"
- "打到3-5了" → "3-5"
- 无法判断时返回 null`;

// ─── Decision Engine System Prompt (simplified for tool call eval) ───
const DE_SYSTEM = `你是一位顶级云顶之弈教练。根据当前对局状态决定调用哪些工具。

## 可用工具
1. search_comps: 根据装备、海克斯和偏好，搜索适配阵容。
2. search_item_recipes: 根据散件列表，查询可合成装备。只接受9种散件。
3. search_hero_build: 查询指定英雄的推荐装备和胜率。
4. search_item_tier: 查询版本装备强度排行。

## 调用条件（严格遵守）
### search_comps
- 调用: 用户有装备且明确无阵容方向/未锁定阵容
- 不调用: 用户已有targetComp且没说要换阵容
- 不调用: 用户只是闲聊/确认

### search_item_recipes
- 调用: 用户有散件装备(basic)，且至少2件
- 不调用: 装备全是成品(completed)
- 不调用: 只有0-1件散件

### search_hero_build
- 调用: 用户已锁定主C英雄(board中有2星+英雄，或问某英雄配装)
- 不调用: 没提到具体英雄

### search_item_tier
- 调用: 用户明确问装备强度/排行
- 不调用: 其他场景

## 决策优先级
1. 有装备+无阵容方向 -> search_comps + search_item_recipes
2. 只有一个英雄配装 -> search_hero_build
3. 已锁定阵容+有散件 -> search_item_recipes
4. 濒死/紧急 -> 只调search_item_recipes
5. 纯确认/闲聊 -> 不调任何工具
6. 装备全是成品(completed) -> 不调search_item_recipes
7. 上9(fast9)偏好+金铲铲 -> 只调search_comps，不调search_item_recipes

只输出JSON tool_calls数组。`;

// ─── DeepSeek call helper ───
async function callDS(messages, temp = 0, tools = null, tool_choice = null) {
  const body = { model: 'deepseek-chat', messages, temperature: temp, max_tokens: 1200 };
  if (tools) { body.tools = tools; body.tool_choice = tool_choice || 'auto'; }
  
  const res = await fetch(DS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + DS_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('DS error ' + res.status);
  const json = await res.json();
  return json.choices[0].message;
}

// ─── State comparison ───
function compareState(actual, expected) {
  let total = 0, matched = 0;
  const fields = ['round', 'health', 'gold', 'preference', 'targetComp'];
  
  for (const f of fields) {
    total++;
    if (actual[f] === expected[f] || (actual[f] == null && expected[f] == null)) matched++;
  }
  
  // equipment
  total++;
  const actEq = actual.equipment || [];
  const expEq = expected.equipment || [];
  if (actEq.length === expEq.length) {
    const eqOk = actEq.every((a, i) => a.name === expEq[i].name && a.type === expEq[i].type);
    if (eqOk) matched++;
  }
  
  // augments
  total++;
  const actAug = (actual.augments || []).sort().join(',');
  const expAug = (expected.augments || []).sort().join(',');
  if (actAug === expAug) matched++;
  
  // board (check names + stars match)
  total++;
  const actBoard = actual.board || [];
  const expBoard = expected.board || [];
  if (actBoard.length === expBoard.length) {
    const bOk = actBoard.every((a, i) => {
      const e = expBoard[i];
      return a.name === e.name && a.star === e.star;
    });
    if (bOk) matched++;
  }
  
  return { total, matched, accuracy: matched / total };
}

// ─── Tool comparison ───
function evaluateTools(actual, expected, forbidden) {
  const actSet = new Set(actual);
  const expSet = new Set(expected);
  const forbSet = new Set(forbidden);
  const tp = [...actSet].filter(t => expSet.has(t)).length;
  const fp = [...actSet].filter(t => forbSet.has(t) || (!expSet.has(t) && !forbSet.has(t))).length;
  const fn = [...expSet].filter(t => !actSet.has(t)).length;
  const recall = tp / (tp + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  // When both expected and actual are empty, it is a perfect match
  let f1 = 2 * recall * precision / (recall + precision) || 0;
  if (expected.length === 0 && actual.length === 0) f1 = 1.0;
  return { recall, precision, f1, tp, fp, fn };
}

// ─── Tool definitions for Function Call ───
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_comps',
      description: '根据装备、海克斯和偏好，搜索适配阵容。当有装备+无阵容方向时调用。',
      parameters: {
        type: 'object',
        properties: {
          equipment: { type: 'array', items: { type: 'string' } },
          augments: { type: 'array', items: { type: 'string' } },
          style: { type: 'string', enum: ['reroll','standard','fast9','any'] }
        },
        required: ['equipment']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_item_recipes',
      description: '根据散件列表查可合成装备。只接受散件。全是成品不调用。',
      parameters: {
        type: 'object',
        properties: { items: { type: 'array', items: { type: 'string' } } },
        required: ['items']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_hero_build',
      description: '查询英雄推荐装备。已锁定主C时调用。hero必须用标准中文名。',
      parameters: {
        type: 'object',
        properties: { hero: { type: 'string' } },
        required: ['hero']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_item_tier',
      description: '查询装备强度排行。用户明确问装备强度时调用。',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// ─── Format state as text for Decision Engine ───
function formatState(state) {
  const parts = ['当前对局状态：'];
  if (state.round) parts.push('- 回合: ' + state.round);
  if (state.equipment && state.equipment.length > 0) {
    parts.push('- 装备: ' + state.equipment.map(e => e.name + '(' + (e.type||'basic') + ')').join('、'));
  }
  if (state.augments && state.augments.length > 0) parts.push('- 已选海克斯: ' + state.augments.join('、'));
  if (state.board && state.board.length > 0) {
    parts.push('- 场上英雄: ' + state.board.map(u => u.name + ' ' + u.star + '星').join('、'));
  }
  if (state.health != null) parts.push('- 血量: ' + state.health);
  if (state.gold != null) parts.push('- 金币: ' + state.gold);
  if (state.preference) parts.push('- 偏好: ' + state.preference);
  if (state.targetComp) parts.push('- 目标阵容: ' + state.targetComp);
  return parts.join('\n');
}

// ─── Main ───
async function main() {
  console.log('=== TFT Voice Assistant v2.1 Eval ===\n');
  
  const stateCases = testCases.filter(tc => tc.category === 'state_parser');
  const toolCases = testCases.filter(tc => tc.category === 'function_call');
  const e2eCases = testCases.filter(tc => tc.category === 'end_to_end');
  
  console.log('Test cases: State=' + stateCases.length + ' Tool=' + toolCases.length + ' E2E=' + e2eCases.length + '\n');
  
  // ─── 1. State Parser ───
  console.log('--- State Parser ---');
  let stateTotalAcc = 0, statePassed = 0;
  const stateResults = [];
  
  for (const tc of stateCases) {
    const start = Date.now();
    try {
      const msg = await callDS([
        { role: 'system', content: STATE_PARSER_SYSTEM },
        { role: 'user', content: tc.input }
      ], 0);
      const raw = msg.content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const actual = JSON.parse(raw);
      const cmp = compareState(actual, tc.expectedState);
      stateTotalAcc += cmp.accuracy;
      if (cmp.accuracy >= 0.875) statePassed++; // >= 7/8 fields correct
      stateResults.push({ id: tc.id, accuracy: cmp.accuracy, matched: cmp.matched + '/' + cmp.total, latency: Date.now() - start, input: tc.input.substring(0, 40) });
      console.log('  ' + tc.id + ': ' + (cmp.accuracy*100).toFixed(0) + '% (' + cmp.matched + '/' + cmp.total + ') in ' + (Date.now()-start) + 'ms');
    } catch(e) {
      stateResults.push({ id: tc.id, accuracy: 0, matched: 'ERR', latency: Date.now()-start, input: tc.input.substring(0, 40), error: e.message });
      console.log('  ' + tc.id + ': ERROR - ' + e.message);
    }
  }
  
  const stateAvgAcc = stateTotalAcc / stateCases.length;
  console.log('\n  Avg accuracy: ' + (stateAvgAcc*100).toFixed(1) + '%  Passed: ' + statePassed + '/' + stateCases.length + ' (>87.5%)\n');
  
  // ─── 2. Function Call ───
  console.log('--- Function Call ---');
  let toolTotalF1 = 0, toolPassed = 0;
  const toolResults = [];
  
  for (const tc of toolCases) {
    const start = Date.now();
    try {
      const stateText = formatState(tc.state);
      const msg = await callDS([
        { role: 'system', content: DE_SYSTEM },
        { role: 'user', content: stateText + '\n\n用户说: ' + tc.input + '\n\n请决定是否需要调用工具。只输出 tool_calls JSON 数组。' }
      ], 0, TOOLS, 'auto');
      
      const actualTools = (msg.tool_calls || []).map(tc => tc.function.name);
      const evalR = evaluateTools(actualTools, tc.expectedTools, tc.forbiddenTools);
      toolTotalF1 += evalR.f1;
      if (evalR.f1 >= 0.85) toolPassed++;
      toolResults.push({ id: tc.id, ...evalR, latency: Date.now() - start, actualTools, expected: tc.expectedTools });
      console.log('  ' + tc.id + ': F1=' + evalR.f1.toFixed(2) + ' recall=' + evalR.recall.toFixed(2) + ' prec=' + evalR.precision.toFixed(2) + ' actual=' + JSON.stringify(actualTools) + ' expect=' + JSON.stringify(tc.expectedTools));
    } catch(e) {
      toolResults.push({ id: tc.id, f1: 0, latency: Date.now()-start, error: e.message });
      console.log('  ' + tc.id + ': ERROR - ' + e.message);
    }
  }
  
  const toolAvgF1 = toolTotalF1 / toolCases.length;
  console.log('\n  Avg F1: ' + toolAvgF1.toFixed(3) + '  Passed: ' + toolPassed + '/' + toolCases.length + ' (F1>0.85)\n');
  
  // ─── 3. End-to-End ───
  console.log('--- End-to-End ---');
  let e2ePassed = 0, e2eTotalLatency = 0;
  const e2eResults = [];
  const E2E_SYSTEM = '你是云顶之弈教练。根据局面给出建议。必须输出合法JSON: {"summary":"分析","compDirection":{"name":"阵容","reason":"理由","coreChampions":["英雄"],"stats":{"avg":3.84,"top4Rate":0.62,"winRate":0.18},"alternatives":["备选"]},"equipmentAllocation":[{"priority":"high","recipe":"合成","target":"英雄"}],"actions":[{"category":"buy","priority":"high","description":"操作","reason":"理由"}],"risks":["风险"],"confidence":0.75,"followup":"追问"}。confidence必须是0-1数字，followup必须有内容。用中文。';
  
  for (const tc of e2eCases) {
    const start = Date.now();
    try {
      const stateText = formatState(tc.state);
      const msg = await callDS([
        { role: 'system', content: E2E_SYSTEM },
        { role: 'user', content: stateText + '\n\n用户说: ' + tc.input + '\n\n请分析并给出JSON格式建议。' }
      ], 0.3);
      
      const raw = (msg.content || '').replace(/```json\n?/g, '').replace(/```/g, '').trim();
      let advice = {};
      try { advice = JSON.parse(raw); } catch { advice = { summary: raw }; }
      
      const checks = tc.checks;
      let passed = true;
      const checkResults = [];
      for (const [check, expected] of Object.entries(checks)) {
        let ok = false;
        if (check === 'confidenceAbove') ok = (advice.confidence || 0) >= expected;
        else if (check === 'hasFollowup') ok = !!advice.followup;
        else if (check === 'followupAboutEquipment') ok = !!((advice.followup || advice.summary || '').match(/装备|散件|开局/));
        else if (check === 'hasCompDirection') ok = !!(advice.compDirection && advice.compDirection.name);
        else if (check === 'hasEquipmentAllocation') ok = !!(advice.equipmentAllocation && advice.equipmentAllocation.length > 0);
        else if (check === 'hasActions') ok = !!(advice.actions && advice.actions.length > 0);
        else if (check === 'hasRisks') ok = !!(advice.risks && advice.risks.length > 0);
        else if (check === 'recommendsAugment') ok = !!((advice.actions || []).some(a => a.category === 'augment') || (advice.summary || '').match(/选|海克斯|战士|法师/));
        else if (check === 'riskMentionsLowHealth') ok = !!((advice.risks || []).some(r => (typeof r === 'string' && r.match(/血量|低血|危险|死/))) || (advice.summary || '').match(/血量|低血|危险/));
        else if (check === 'riskMentionsNoItems') ok = !!((advice.risks || []).some(r => typeof r === 'string' && r.match(/装备|散件|少/)));
        else if (check === 'actionsIncludeRollOrAllIn') ok = !!((advice.actions || []).some(a => a.category === 'roll' || a.category === 'level_up') || (advice.summary || '').match(/D|花光|all.in/i));
        else ok = true;
        if (!ok) passed = false;
        checkResults.push(check + ':' + ok);
      }
      
      const latency = Date.now() - start;
      e2eTotalLatency += latency;
      if (passed) e2ePassed++;
      if (!advice.confidence && advice.confidence !== 0) {
        console.log('  DEBUG raw (' + tc.id + '): ' + raw.substring(0, 200));
      }
      e2eResults.push({ id: tc.id, passed, checks: checkResults.join(' '), latency, confidence: advice.confidence });
      console.log('  ' + tc.id + ': ' + (passed ? 'PASS' : 'FAIL') + ' in ' + latency + 'ms conf=' + (advice.confidence != null ? advice.confidence : 'N/A') + ' [' + checkResults.join(' ') + ']');
    } catch(e) {
      e2eResults.push({ id: tc.id, passed: false, latency: Date.now()-start, error: e.message });
      console.log('  ' + tc.id + ': ERROR - ' + e.message);
    }
  }
  
  const e2eAvgLatency = e2eTotalLatency / (e2eCases.length || 1);
  console.log('\n  Passed: ' + e2ePassed + '/' + e2eCases.length + '  Avg latency: ' + e2eAvgLatency.toFixed(0) + 'ms\n');
  // ─── Summary ───
  console.log('========== SUMMARY ==========');
  console.log('State Parser:  ' + (stateAvgAcc*100).toFixed(1) + '% (' + statePassed + '/' + stateCases.length + ' passed)  Target: >90%');
  console.log('Function Call: F1=' + toolAvgF1.toFixed(3) + ' (' + toolPassed + '/' + toolCases.length + ' passed)  Target: >0.85');
  console.log('End-to-End:    ' + e2ePassed + '/' + e2eCases.length + ' passed  Avg ' + e2eAvgLatency.toFixed(0) + 'ms  Target: <4s');
  console.log('=============================');
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    stateParser: { avgAccuracy: stateAvgAcc, passed: statePassed + '/' + stateCases.length, results: stateResults },
    functionCall: { avgF1: toolAvgF1, passed: toolPassed + '/' + toolCases.length, results: toolResults },
    endToEnd: { passed: e2ePassed + '/' + e2eCases.length, avgLatencyMs: e2eAvgLatency, results: e2eResults }
  };
  writeFileSync('outputs/v2.1/eval-report.json', JSON.stringify(report, null, 2), 'utf-8');
  console.log('\nReport saved to outputs/v2.1/eval-report.json');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
