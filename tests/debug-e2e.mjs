// Debug E2E: show raw DeepSeek output
import { readFileSync } from 'fs';

const KEY = process.env.DEEPSEEK_API_KEY;
const cases = JSON.parse(readFileSync('outputs/v2.1/agent-eval.json', 'utf-8')).filter(t => t.category === 'end_to_end').slice(0, 3);

async function callDS(msgs, temp) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
    body: JSON.stringify({ model: 'deepseek-chat', messages: msgs, temperature: temp, max_tokens: 800 }),
  });
  const j = await r.json();
  return j.choices[0].message.content;
}

function fmt(s) {
  const p = ['当前对局状态：'];
  if (s.round) p.push('- 回合: ' + s.round);
  if (s.equipment && s.equipment.length > 0) p.push('- 装备: ' + s.equipment.map(e => e.name + '(' + (e.type || 'basic') + ')').join('、'));
  if (s.augments && s.augments.length > 0) p.push('- 海克斯: ' + s.augments.join('、'));
  if (s.board && s.board.length > 0) p.push('- 场上: ' + s.board.map(u => u.name + ' ' + u.star + '星').join('、'));
  if (s.health != null) p.push('- 血量: ' + s.health);
  if (s.gold != null) p.push('- 金币: ' + s.gold);
  if (s.preference) p.push('- 偏好: ' + s.preference);
  if (s.targetComp) p.push('- 目标: ' + s.targetComp);
  return p.join('\n');
}

const sys = '你是云顶之弈教练。根据局面给出建议。必须输出合法JSON: {"summary":"分析","compDirection":{"name":"阵容","reason":"理由","coreChampions":["英雄"],"stats":{"avg":3.84,"top4Rate":0.62,"winRate":0.18},"alternatives":["备选"]},"equipmentAllocation":[{"priority":"high","recipe":"合成","target":"英雄"}],"actions":[{"category":"buy","priority":"high","description":"操作","reason":"理由"}],"risks":["风险"],"confidence":0.75,"followup":"追问"}。confidence必须是0-1数字，followup必须有内容。';

for (const tc of cases) {
  const raw = await callDS([
    { role: 'system', content: sys },
    { role: 'user', content: fmt(tc.state) + '\n\n用户说: ' + tc.input + '\n\n请分析并给出JSON格式建议。' },
  ], 0.3);
  console.log('=== ' + tc.id + ' ===');
  console.log('RAW (' + raw.length + ' chars):');
  console.log(raw.substring(0, 400));
  console.log('---');
  const clean = raw.replace(/`{3}json\n?/g, '').replace(/`{3}/g, '').trim();
  try {
    const a = JSON.parse(clean);
    console.log('Parsed OK. confidence=' + a.confidence + ' followup=' + (a.followup || 'MISSING'));
  } catch (e) {
    console.log('PARSE FAILED. Cleaned:', clean.substring(0, 200));
  }
  console.log('');
}
