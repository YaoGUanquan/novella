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
    age: nested.age ?? item.age,
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
  '只返回 JSON 数组，不要包成字符串，不要使用 Markdown 代码块。每项必须包含 name、role、description、personality、background、gender、age、features、appearance、clothing。appearance 必须含 hairStyle、hairColor、eyeColor、skinTone、bodyType、height、features。bodyType 只能是 slim、average、athletic、heavy；height 用厘米数字（如 175）。颜色尽量给十六进制，同时可在 features 里写中文描述。clothing 为数组，每项含 type(head|top|bottom|shoes|accessory)、name、style、color。';

export function parseCharacterDrafts(response: string): Character[] {
  const start = response.indexOf('[');
  const end = response.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('AI 回复尚未包含完整角色 JSON');
  const parsed = JSON.parse(response.slice(start, end + 1)) as Array<
    Partial<Character> & Record<string, unknown>
  >;
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI 未返回可用角色');
  return parsed.map((item, index) => ({
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
