const NAMED_COLORS: Record<string, string> = {
  黑色: '#1A1A1A',
  黑: '#111111',
  黑褐色: '#3B2F2F',
  褐色: '#5C4033',
  棕色: '#6B3F2A',
  白皙: '#F5D6BA',
  白色: '#F5F5F5',
  白: '#F8F8F8',
  黄色: '#E6C35C',
  金色: '#D4A017',
  红色: '#B42318',
  蓝色: '#2563EB',
  灰色: '#6B7280',
};

export const HEIGHT_SELECT_VALUES = ['short', 'average', 'tall'] as const;
export const BODY_TYPE_SELECT_VALUES = ['slim', 'average', 'athletic', 'heavy'] as const;

const HEIGHT_ALIASES: Record<string, (typeof HEIGHT_SELECT_VALUES)[number]> = {
  short: 'short',
  矮: 'short',
  矮小: 'short',
  petite: 'short',
  average: 'average',
  medium: 'average',
  中等: 'average',
  标准: 'average',
  tall: 'tall',
  高: 'tall',
  偏高: 'tall',
};

const BODY_TYPE_ALIASES: Record<string, (typeof BODY_TYPE_SELECT_VALUES)[number]> = {
  slim: 'slim',
  thin: 'slim',
  lean: 'slim',
  纤细: 'slim',
  瘦: 'slim',
  偏瘦: 'slim',
  average: 'average',
  medium: 'average',
  中等: 'average',
  标准: 'average',
  athletic: 'athletic',
  strong: 'athletic',
  健壮: 'athletic',
  结实: 'athletic',
  heavy: 'heavy',
  plump: 'heavy',
  丰满: 'heavy',
  壮: 'heavy',
};

export function isHeightSelectValue(value: string | number | undefined): boolean {
  return (
    typeof value === 'string' &&
    HEIGHT_SELECT_VALUES.includes(value as (typeof HEIGHT_SELECT_VALUES)[number])
  );
}

export function isBodyTypeSelectValue(value: string | undefined): boolean {
  return (
    typeof value === 'string' &&
    BODY_TYPE_SELECT_VALUES.includes(value as (typeof BODY_TYPE_SELECT_VALUES)[number])
  );
}

export function normalizeHeightValue(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const trimmed = value.trim();
  const alias = HEIGHT_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const numeric = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (numeric) return numeric[1];
  return trimmed;
}

export function normalizeBodyTypeValue(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const trimmed = value.trim();
  return BODY_TYPE_ALIASES[trimmed.toLowerCase()] ?? BODY_TYPE_ALIASES[trimmed] ?? trimmed;
}

export function appearanceColorSwatch(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
  return NAMED_COLORS[trimmed] ?? fallback;
}
