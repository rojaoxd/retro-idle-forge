/**
 * Parsers isomórficos (browser + node) para os XMLs do OTServ 7.4.
 * Cada parser recebe texto XML e devolve um array pronto pra UPSERT.
 */
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "_text",
  parseAttributeValue: true,
  isArray: (name) =>
    [
      "item",
      "attribute",
      "vocation",
      "outfit",
      "list",
      "channel",
      "stage",
      "world",
      "group",
      "monster",
      "attack",
      "defense",
      "voice",
      "immunity",
      "flag",
      "element",
      "summon",
      "spawn",
      "house",
      "rune",
      "instant",
      "conjure",
      "vocation",
      "town",
      "raid",
      "npc",
      "parameter",
    ].includes(name),
});

const toArr = <T>(x: T | T[] | undefined): T[] =>
  x === undefined ? [] : Array.isArray(x) ? x : [x];

// ---------- items ----------
export function parseItems(xml: string) {
  const doc: any = parser.parse(xml);
  const items = toArr(doc?.items?.item);
  const out: any[] = [];
  for (const it of items) {
    const attrs: Record<string, any> = {};
    const flags: Record<string, any> = {};
    for (const a of toArr(it.attribute)) {
      const k = String(a.key ?? "").trim();
      const v = a.value;
      if (!k) continue;
      // flags conhecidas viram flags jsonb
      if (
        [
          "blockprojectile",
          "blocksolid",
          "blockpathfind",
          "pickupable",
          "stackable",
          "rotatable",
          "moveable",
          "showcount",
          "readable",
          "writeable",
          "walkstack",
          "cache",
        ].includes(k.toLowerCase())
      ) {
        flags[k] = v === "1" || v === 1 || v === "true" || v === true;
      } else {
        attrs[k] = v;
      }
    }
    // faixa "108-109"
    const idField = String(it.id);
    const range = idField.includes("-")
      ? idField.split("-").map((n) => Number(n))
      : [Number(it.id), Number(it.id)];
    for (let id = range[0]; id <= range[1]; id++) {
      out.push({
        id,
        name: it.name ?? null,
        article: it.article ?? null,
        plural: it.plural ?? null,
        description: attrs.description ?? null,
        weight: toNum(attrs.weight),
        attack: toNum(attrs.attack),
        defense: toNum(attrs.defense),
        armor: toNum(attrs.armor),
        range_val: toNum(attrs.range),
        charges: toNum(attrs.charges),
        decayto: toNum(attrs.decayTo),
        duration: toNum(attrs.duration),
        transformequipto: toNum(attrs.transformEquipTo),
        transformdeequipto: toNum(attrs.transformDeEquipTo),
        slot_type: attrs.slotType ?? null,
        weapon_type: attrs.weaponType ?? null,
        ammo_type: attrs.ammoType ?? null,
        shoot_type: attrs.shootType ?? null,
        effect: attrs.effect ?? null,
        fluid_source: attrs.fluidSource ?? null,
        writeable: !!attrs.writeable,
        maxtextlen: toNum(attrs.maxTextLen),
        flags,
        attributes: attrs,
      });
    }
  }
  return out;
}

// ---------- vocations ----------
export function parseVocations(xml: string) {
  const doc: any = parser.parse(xml);
  const vocs = toArr(doc?.vocations?.vocation);
  return vocs.map((v: any) => ({
    id: Number(v.id),
    client_id: toNum(v.clientId),
    name: v.name,
    description: v.description ?? null,
    needpremium: v.needpremium === 1 || v.needpremium === "1",
    from_voc: toNum(v.fromvoc),
    gaincap: toNum(v.gaincap) ?? 10,
    gainhp: toNum(v.gainhp) ?? 5,
    gainmana: toNum(v.gainmana) ?? 5,
    gainhpticks: toNum(v.gainhpticks) ?? 6,
    gainhpamount: toNum(v.gainhpamount) ?? 1,
    gainmanaticks: toNum(v.gainmanaticks) ?? 6,
    gainmanaamount: toNum(v.gainmanaamount) ?? 2,
    manamultiplier: toNum(v.manamultiplier) ?? 4,
    attackspeed: toNum(v.attackspeed) ?? 2000,
    soulmax: toNum(v.soulmax) ?? 100,
    gainsoulticks: toNum(v.gainsoulticks) ?? 120,
    lessloss: toNum(v.lessloss),
    formula: v.formula ?? {},
    skill: v.skill ?? {},
  }));
}

// ---------- outfits ----------
export function parseOutfits(xml: string) {
  const doc: any = parser.parse(xml);
  const outfits = toArr(doc?.outfits?.outfit);
  const out: any[] = [];
  for (const o of outfits) {
    for (const l of toArr(o.list)) {
      out.push({
        look_type: Number(l.lookType),
        gender: String(l.gender) === "0" ? "female" : "male",
        name: l.name,
        premium: !!l.premium,
        unlocked: l.unlocked !== "no" && l.unlocked !== 0,
        access: toNum(l.access) ?? 0,
        quest_storage: toNum(l.quest),
      });
    }
  }
  return out;
}

// ---------- channels ----------
export function parseChannels(xml: string) {
  const doc: any = parser.parse(xml);
  return toArr(doc?.channels?.channel).map((c: any) => ({
    id: Number(c.id),
    name: c.name,
    active: c.active !== "no",
    logged: c.logged === "yes",
    access: toNum(c.access) ?? 0,
    level: toNum(c.level) ?? 0,
    vocations: [],
  }));
}

// ---------- stages ----------
export function parseStages(xml: string) {
  const doc: any = parser.parse(xml);
  const worlds = toArr(doc?.stages?.world);
  const out: any[] = [];
  for (const w of worlds) {
    for (const s of toArr(w.stage)) {
      out.push({
        world_id: Number(w.id ?? 0),
        min_level: Number(s.minlevel),
        max_level: toNum(s.maxlevel),
        multiplier: Number(s.multiplier),
      });
    }
  }
  return out;
}

// ---------- groups ----------
export function parseGroups(xml: string) {
  const doc: any = parser.parse(xml);
  return toArr(doc?.groups?.group).map((g: any) => ({
    id: Number(g.id),
    name: g.name,
    flags: toBig(g.flags),
    custom_flags: toBig(g.customFlags),
    access_level: toNum(g.access) ?? 0,
    violation_level: toNum(g.violationReasons) ?? 0,
  }));
}

// ---------- spells ----------
export function parseSpells(xml: string) {
  const doc: any = parser.parse(xml);
  const spells = doc?.spells ?? {};
  const out: any[] = [];
  const mapCommon = (s: any, kind: string) => ({
    kind,
    name: s.name,
    words: s.words ?? null,
    item_id: toNum(s.id),
    mana: toNum(s.mana) ?? 0,
    level: toNum(s.lvl) ?? 0,
    maglv: toNum(s.maglv) ?? 0,
    soul: toNum(s.soul) ?? 0,
    charges: toNum(s.charges),
    exhaustion: toNum(s.exhaustion) ?? 0,
    premium: s.prem === "1" || s.prem === 1,
    needtarget: s.needtarget === "1" || s.needtarget === 1,
    selftarget: s.selftarget === "1" || s.selftarget === 1,
    aggressive: !(s.aggressive === "0" || s.aggressive === 0),
    allowfaruse: s.allowfaruse === "1" || s.allowfaruse === 1,
    blocktype: s.blocktype ?? null,
    range_val: toNum(s.range),
    vocations: [],
    conjure: {
      conjureId: toNum(s.conjureId),
      conjureCount: toNum(s.conjureCount),
      reagentId: toNum(s.reagentId),
    },
    event_type: s.event ?? null,
    event_value: s.value ?? null,
  });
  for (const s of toArr(spells.rune)) out.push(mapCommon(s, "rune"));
  for (const s of toArr(spells.instant)) out.push(mapCommon(s, "instant"));
  for (const s of toArr(spells.conjure)) out.push(mapCommon(s, "conjure"));
  return out;
}

// ---------- monsters (arquivo único) ----------
export function parseMonster(xml: string, fileName?: string) {
  const doc: any = parser.parse(xml);
  const m = doc?.monster;
  if (!m) return null;
  return {
    name: m.name,
    name_description: m.nameDescription ?? null,
    race: m.race ?? null,
    experience: toNum(m.experience) ?? 0,
    speed: toNum(m.speed) ?? 200,
    manacost: toNum(m.manacost),
    health_max: toNum(m.health?.max) ?? 100,
    look: m.look ?? {},
    flags: Object.assign({}, ...toArr(m.flags?.flag).map((f: any) => f)),
    attacks: toArr(m.attacks?.attack),
    defenses: {
      armor: toNum(m.defenses?.armor),
      defense: toNum(m.defenses?.defense),
      list: toArr(m.defenses?.defense).filter((d: any) => typeof d === "object"),
    },
    immunities: Object.assign({}, ...toArr(m.immunities?.immunity).map((f: any) => f)),
    elements: Object.assign({}, ...toArr(m.elements?.element).map((f: any) => f)),
    summons: toArr(m.summons?.summon),
    voices: toArr(m.voices?.voice),
    loot: toArr(m.loot?.item),
    target_change: m.targetchange ?? {},
    strategy: m.strategy ?? {},
    raw_xml: fileName ? `[from: ${fileName}]` : null,
  };
}

// ---------- npc (xml + lua opcional) ----------
export function parseNpc(xml: string, luaSource?: string) {
  const doc: any = parser.parse(xml);
  const n = doc?.npc;
  if (!n) return null;
  const parameters: Record<string, any> = {};
  for (const p of toArr(n.parameters?.parameter)) {
    parameters[p.key] = p.value;
  }
  // extração leve das trades e keywords do Lua
  const keywords: string[] = [];
  const shop: any[] = [];
  const travels: any[] = [];
  if (luaSource) {
    const kwRe = /keywordHandler:addKeyword\(\{['"]([^'"]+)['"]/g;
    let match;
    while ((match = kwRe.exec(luaSource))) keywords.push(match[1]);
    const shopRe = /addBuyableItem[^\(]*\([^,]+,\s*(\d+)\s*,\s*(\d+)/g;
    while ((match = shopRe.exec(luaSource)))
      shop.push({ itemid: Number(match[1]), price: Number(match[2]), op: "buy" });
    const shopRe2 = /addSellableItem[^\(]*\([^,]+,\s*(\d+)\s*,\s*(\d+)/g;
    while ((match = shopRe2.exec(luaSource)))
      shop.push({ itemid: Number(match[1]), price: Number(match[2]), op: "sell" });
    const travelRe = /addTravelKeyword\(['"]([^'"]+)['"][^\)]*,\s*(\d+)\s*,\s*(\d+)/g;
    while ((match = travelRe.exec(luaSource)))
      travels.push({ dest: match[1], price: Number(match[2]) });
  }
  return {
    name: n.name,
    script_file: n.script ?? null,
    walk_interval: toNum(n.walkinterval) ?? 2000,
    floor_change: !!(n.floorchange && n.floorchange !== "0"),
    speed: toNum(n.speed),
    health_max: toNum(n.health?.max) ?? 100,
    look: n.look ?? {},
    parameters,
    keywords,
    shop_items: shop,
    travels,
    voices: [],
    raw_lua: luaSource ?? null,
  };
}

// ---------- houses ----------
export function parseHouses(xml: string) {
  const doc: any = parser.parse(xml);
  return toArr(doc?.houses?.house).map((h: any) => ({
    id: Number(h.houseid),
    name: h.name,
    town_id: toNum(h.townid),
    entry_x: Number(h.entryx),
    entry_y: Number(h.entryy),
    entry_z: Number(h.entryz),
    size: toNum(h.size),
    rent: toNum(h.rent),
  }));
}

// ---------- spawns ----------
export function parseSpawns(xml: string) {
  const doc: any = parser.parse(xml);
  return toArr(doc?.spawns?.spawn).map((s: any) => ({
    center_x: Number(s.centerx),
    center_y: Number(s.centery),
    center_z: Number(s.centerz),
    radius: Number(s.radius ?? 1),
    creatures: toArr(s.monster).map((c: any) => ({
      name: c.name,
      x: Number(c.x ?? 0),
      y: Number(c.y ?? 0),
      z: Number(c.z ?? 0),
      spawntime: Number(c.spawntime ?? 60),
    })),
  }));
}

// ---------- helpers ----------
function toNum(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toBig(v: any): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
