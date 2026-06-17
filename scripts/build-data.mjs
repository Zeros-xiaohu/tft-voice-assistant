/**
 * CDragon 数据构建脚本
 * 下载 raw/tft-zh_cn.json，提取当前赛季装备合成和英雄数据。
 * 用法: node scripts/build-data.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';

const CDRAGON_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/zh_cn.json';
const DATA_DIR = 'src/data';
const ITEMS_OUT = DATA_DIR + '/items.json';
const CHAMPIONS_OUT = DATA_DIR + '/champions.json';

async function main() {
  console.log('Downloading CDragon data...');
  
  let raw;
  try {
    const res = await fetch(CDRAGON_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    raw = await res.json();
    console.log('Downloaded OK');
  } catch (e) {
    console.error('Download failed:', e.message);
    console.log('Using built-in fallback data...');
    buildFallback();
    return;
  }

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Extract items: raw.items is an array of { id, name, composition, ... }
  const itemList = raw.items || [];
  console.log('Items in CDragon: ' + itemList.length);

  // Build ID -> name map
  const idToName = {};
  for (const item of itemList) {
    if (item.id && item.name) idToName[item.id] = item.name;
  }

  // Build composition (recipe) table
  const composition = {};
  for (const item of itemList) {
    if (item.name && item.composition && item.composition.length === 2) {
      const compNames = item.composition.map(cid => idToName[cid] || cid);
      composition[item.name] = compNames;
    }
  }

  const itemsOutput = {
    downloaded: new Date().toISOString(),
    source: 'CDragon',
    totalItems: itemList.length,
    recipes: Object.keys(composition).length,
    composition,
  };
  writeFileSync(ITEMS_OUT, JSON.stringify(itemsOutput, null, 2), 'utf-8');
  console.log('Written ' + Object.keys(composition).length + ' recipes to ' + ITEMS_OUT);

  // Extract champions from sets
  const sets = raw.sets || {};
  // Find highest set number (current season)
  const setNums = Object.keys(sets).map(Number).sort((a,b)=>b-a);
  const currentSet = setNums[0] || 17;
  console.log('Current set: ' + currentSet);

  const setData = sets[currentSet];
  const champList = [];
  
  if (setData && setData.champions) {
    for (const champ of setData.champions) {
      champList.push({
        id: champ.apiName || champ.characterId || '',
        name: champ.name || '',
        cost: champ.cost || 0,
        traits: (champ.traits || []).map(t => typeof t === 'string' ? t : t.name || ''),
      });
    }
  }

  writeFileSync(CHAMPIONS_OUT, JSON.stringify(champList, null, 2), 'utf-8');
  console.log('Written ' + champList.length + ' champions to ' + CHAMPIONS_OUT);
  console.log('Done!');
}

function buildFallback() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const basic = ['反曲弓','暴风大剑','无用大棒','女神之泪','锁子甲','负极斗篷','巨人腰带','金铲铲','拳套'];
  const completed = [
    ['鬼索的狂暴之刃',0,0],['无尽之刃',1,1],['巨人杀手',0,1],['最后的轻语',0,6],
    ['蓝霸符',3,3],['朔极之矛',1,3],['珠光护手',2,8],['灭世者的死亡之帽',2,2],
    ['大天使之杖',2,3],['狂徒铠甲',7,7],['石像鬼石板甲',4,5],['巨龙之爪',5,5],
    ['荆棘之甲',4,4],['救赎',3,7],['莫雷洛秘典',2,7],['海克斯科技枪刃',1,2],
    ['离子火花',2,5],['日炎斗篷',4,7],['泰坦的坚决',0,4],['饮血剑',1,5],
    ['守护天使',1,4],['斯特拉克的挑战护手',1,7],['正义之手',3,8],['水银',3,8],
    ['疾射火炮',0,0],['卢安娜的飓风',0,5],['窃贼手套',8,8],['红霸符',0,7],
    ['斯塔缇克电刃',0,3],['冰霜之心',3,4],['薄暮法袍',7,8],['坚定之心',7,8],
    ['冕卫',2,4],['夜之锋刃',1,8],['死亡之刃',1,1],
  ];

  const composition = {};
  for (const [name, a, b] of completed) {
    composition[name] = [basic[a], basic[b]];
  }

  writeFileSync(ITEMS_OUT, JSON.stringify({ downloaded: new Date().toISOString(), source: 'built-in fallback', recipes: Object.keys(composition).length, composition }, null, 2), 'utf-8');

  const champs = [
    {name:'金克斯',cost:4},{name:'德莱文',cost:1},{name:'德莱厄斯',cost:1},{name:'斯维因',cost:3},
    {name:'卡特琳娜',cost:2},{name:'塔姆',cost:1},{name:'盖伦',cost:2},{name:'亚托克斯',cost:3},
    {name:'莫德凯撒',cost:4},{name:'锐雯',cost:2},{name:'维克托',cost:4},{name:'莫甘娜',cost:4},
    {name:'乐芙兰',cost:3},{name:'蔚',cost:3},{name:'艾克',cost:5},{name:'蕾欧娜',cost:3},
    {name:'俄洛伊',cost:2},{name:'赛娜',cost:3},{name:'内瑟斯',cost:2},{name:'潘森',cost:1},
    {name:'佐伊',cost:4},{name:'菲奥娜',cost:5},{name:'维迦',cost:3},{name:'拉克丝',cost:3},
    {name:'劫',cost:2},{name:'阿卡丽',cost:3},{name:'派克',cost:1},{name:'慎',cost:3},{name:'李青',cost:5},
  ];
  writeFileSync(CHAMPIONS_OUT, JSON.stringify(champs, null, 2), 'utf-8');
  console.log('Fallback data written.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
