import type { CharacterAppearance, ClothingItem } from '@/core/audio/types/composition';
import type { Character } from '@/core/script/types/novel';
import {
  normalizeBodyTypeValue,
  normalizeHeightValue,
} from '@/features/character-consistency/appearance-form';

const CHARACTER_ROLES: Character['role'][] = [
  'main',
  'supporting',
  'minor',
  'protagonist',
  'antagonist',
];
const CLOTHING_TYPES: ClothingItem['type'][] = ['head', 'top', 'bottom', 'shoes', 'accessory'];

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => item.trim());
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[、,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function parseAppearance(
  item: Partial<Character> & Record<string, unknown>
): CharacterAppearance | undefined {
  const nested =
    item.appearance && typeof item.appearance === 'object' && !Array.isArray(item.appearance)
      ? (item.appearance as Record<string, unknown>)
      : {};
  const features = uniqueStrings([
    ...parseFeatures(nested.features),
    ...parseFeatures(item.features),
  ]);
  const appearance: CharacterAppearance = {
    gender: asString(nested.gender) ?? asString(item.gender),
    age:
      typeof nested.age === 'number' || typeof nested.age === 'string'
        ? nested.age
        : typeof item.age === 'number' || typeof item.age === 'string'
          ? item.age
          : undefined,
    hairStyle: asString(nested.hairStyle) ?? asString(item.hairStyle),
    hairColor: asString(nested.hairColor) ?? asString(item.hairColor),
    eyeColor: asString(nested.eyeColor) ?? asString(item.eyeColor),
    skinTone: asString(nested.skinTone) ?? asString(item.skinTone),
    bodyType: normalizeBodyTypeValue(asString(nested.bodyType) ?? asString(item.bodyType)),
    height: normalizeHeightValue(nested.height ?? item.height),
    weight:
      typeof nested.weight === 'number' || typeof nested.weight === 'string'
        ? nested.weight
        : typeof item.weight === 'number' || typeof item.weight === 'string'
          ? item.weight
          : undefined,
    features: features.length > 0 ? features : undefined,
  };
  return Object.values(appearance).some(
    (entry) => entry !== undefined && !(Array.isArray(entry) && entry.length === 0)
  )
    ? appearance
    : undefined;
}

function parseClothing(value: unknown): ClothingItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: ClothingItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const type = CLOTHING_TYPES.includes(record.type as ClothingItem['type'])
      ? (record.type as ClothingItem['type'])
      : 'top';
    items.push({
      type,
      name: asString(record.name) ?? '未命名服饰',
      style: asString(record.style) ?? 'casual',
      color: asString(record.color) ?? '#FFFFFF',
      pattern: asString(record.pattern),
      material: asString(record.material),
    });
  }
  return items.length > 0 ? items : undefined;
}

export const CHARACTER_CANDIDATE_INSTRUCTIONS =
  '只返回一个 JSON 对象，不要包成字符串，不要使用 Markdown 代码块。格式必须是 {"outline":"剧情大纲正文","characters":[...]}。outline 是可直接作为项目正文的剧情大纲，必须根据角色设定撰写起因、人物关系、核心冲突和结局走向，不要只重复项目简介。characters 每项必须包含 name、role、description、personality、background、gender、age、features、appearance、clothing。appearance 必须含 hairStyle、hairColor、eyeColor、skinTone、bodyType、height、features。bodyType 只能是 slim、average、athletic、heavy；height 用厘米数字（如 175）。颜色尽量给十六进制，同时可在 features 里写中文描述。clothing 为数组，每项含 type(head|top|bottom|shoes|accessory)、name、style、color。项目正文为空时 outline 不能空；用户只要大纲时 characters 可为 []。';

export interface PlanningDraft {
  characters: Character[];
  outline: string;
}

function parseOutlineText(value: unknown): string {
  return asString(value) ?? '';
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function unescapeJsonString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractJsonString(text: string, key: string): string {
  const marker = `"${key}"`;
  const keyIndex = text.indexOf(marker);
  if (keyIndex < 0) return '';
  const colon = text.indexOf(':', keyIndex + marker.length);
  if (colon < 0) return '';
  let index = colon + 1;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  if (text[index] !== '"') return '';
  index += 1;
  let raw = '';
  while (index < text.length) {
    const current = text[index];
    if (current === '\\' && index + 1 < text.length) {
      raw += current + text[index + 1];
      index += 2;
      continue;
    }
    if (current === '"') {
      const parsed = tryParseJson(`"${raw}"`);
      return typeof parsed === 'string' ? parsed : unescapeJsonString(raw);
    }
    raw += current;
    index += 1;
  }
  return unescapeJsonString(raw);
}

function extractCompleteJsonObjects(text: string): unknown[] {
  const objects: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (current === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (current === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (current === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (current === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const parsed = tryParseJson(text.slice(start, index + 1));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          objects.push(parsed);
        }
        start = -1;
      }
    }
  }
  return objects;
}

function mapCharacterDrafts(parsed: unknown[]): Character[] {
  return parsed
    .filter((item): item is Partial<Character> & Record<string, unknown> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item))
    )
    .map((item, index) => ({
      id: `character_${Date.now()}_${index}`,
      name: item.name?.trim() || `角色 ${index + 1}`,
      role: CHARACTER_ROLES.includes(item.role as Character['role'])
        ? (item.role as Character['role'])
        : index === 0
          ? 'main'
          : 'supporting',
      description: item.description ?? '',
      personality: item.personality ?? '',
      background: item.background ?? '',
      gender: asString(item.gender),
      age:
        typeof item.age === 'number' || typeof item.age === 'string' ? String(item.age) : undefined,
      features: parseFeatures(item.features),
      appearance: parseAppearance(item),
      clothing: parseClothing(item.clothing),
    }));
}

function planningDraftFromRecord(parsed: Record<string, unknown>): PlanningDraft | null {
  const outline = parseOutlineText(parsed.outline ?? parsed.story ?? parsed.content);
  const rawCharacters = parsed.characters;
  const characters =
    Array.isArray(rawCharacters) && rawCharacters.length > 0
      ? mapCharacterDrafts(rawCharacters)
      : [];
  if (!outline && characters.length === 0) return null;
  return { characters, outline };
}

function recoverPlanningDraft(response: string): PlanningDraft | null {
  const outline =
    extractJsonString(response, 'outline') ||
    extractJsonString(response, 'story') ||
    extractJsonString(response, 'content');
  const charactersKey = response.search(/"characters"\s*:/);
  const searchFrom = charactersKey >= 0 ? response.slice(charactersKey) : response;
  const recovered = extractCompleteJsonObjects(searchFrom);
  const characters = recovered.length > 0 ? mapCharacterDrafts(recovered) : [];
  if (!outline && characters.length === 0) return null;
  return { characters, outline };
}

function throwIncompletePlanningDraft(): never {
  throw new Error('候选稿 JSON 不完整或被截断，没有可回填的大纲或角色');
}

export function parsePlanningDrafts(response: string): PlanningDraft {
  const objectStart = response.indexOf('{');
  const arrayStart = response.indexOf('[');
  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    const end = response.lastIndexOf('}');
    if (end > objectStart) {
      const parsed = tryParseJson(response.slice(objectStart, end + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const draft = planningDraftFromRecord(parsed as Record<string, unknown>);
        if (draft) return draft;
      }
    }
    const recovered = recoverPlanningDraft(response);
    if (recovered) return recovered;
    throwIncompletePlanningDraft();
  }
  return { characters: parseCharacterDrafts(response), outline: '' };
}

export function parseCharacterDrafts(response: string): Character[] {
  const start = response.indexOf('[');
  if (start < 0) throw new Error('AI 回复尚未包含完整角色 JSON');
  const end = response.lastIndexOf(']');
  if (end > start) {
    const parsed = tryParseJson(response.slice(start, end + 1));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mapCharacterDrafts(parsed);
    }
    if (Array.isArray(parsed) && parsed.length === 0) {
      throw new Error('AI 未返回可用角色');
    }
  }
  const recovered = extractCompleteJsonObjects(response.slice(start));
  if (recovered.length === 0) throwIncompletePlanningDraft();
  return mapCharacterDrafts(recovered);
}
