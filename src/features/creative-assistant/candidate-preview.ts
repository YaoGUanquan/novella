export type CandidatePreviewNode =
  | { kind: 'field'; label: string; value: string }
  | { kind: 'group'; label: string; children: CandidatePreviewNode[] }
  | { kind: 'item'; title: string; children: CandidatePreviewNode[] };

const MAX_DEPTH = 4;
const COMPACT_VALUE_LENGTH = 24;

const SKIP_KEYS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'firstAppearance',
  'dialogues',
  'relationships',
  'consistency',
  'voice',
  'tags',
  'importance',
  'expressions',
]);

const FIELD_LABELS: Record<string, string> = {
  name: '角色名称',
  role: '角色定位',
  description: '简介',
  personality: '性格特征',
  background: '背景',
  gender: '性别',
  age: '年龄',
  features: '外观特征',
  appearance: '外观',
  clothing: '服饰',
  hairStyle: '发型',
  hairColor: '发色',
  eyeColor: '瞳色',
  skinTone: '肤色',
  bodyType: '体型',
  height: '身高',
  weight: '体重',
  type: '类型',
  style: '风格',
  color: '颜色',
  pattern: '图案',
  material: '材质',
  aliases: '别名',
  camera: '机位',
  composition: '构图',
  character: '出场角色',
  dialogue: '对白',
  prompt: '画面提示',
  title: '标题',
  sceneDescription: '场景',
  cameraType: '镜头',
  duration: '时长',
  outline: '剧情大纲',
  story: '剧情大纲',
  characters: '角色',
};

const VALUE_LABELS: Record<string, string> = {
  main: '主角',
  protagonist: '主角',
  supporting: '配角',
  minor: '次要',
  antagonist: '反派',
  head: '头饰',
  top: '上装',
  bottom: '下装',
  shoes: '鞋履',
  accessory: '配饰',
  casual: '休闲',
  formal: '正式',
  male: '男',
  female: '女',
};

function fieldLabel(key: string, parentKey?: string): string {
  if (key === 'name' && parentKey === 'clothing') return '名称';
  return FIELD_LABELS[key] ?? key;
}

function displayValue(key: string, value: string): string {
  if (key === 'role' || key === 'type' || key === 'style' || key === 'gender') {
    return VALUE_LABELS[value] ?? value;
  }
  return VALUE_LABELS[value] ?? value;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function unwrapStructuredDraft(value: string): string {
  let text = value.trim().replace(/^\uFEFF/, '');
  const fence = text.match(/^```(?:json|javascript|js)?\s*\n?([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  for (let index = 0; index < 3; index += 1) {
    if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (typeof parsed === 'string') {
          text = parsed.trim();
          continue;
        }
      } catch {
        break;
      }
    }
    break;
  }
  if (text.startsWith('"') && (text[1] === '[' || text[1] === '{')) {
    text = text.slice(1);
  }
  const bracket = text.indexOf('[');
  const brace = text.indexOf('{');
  const start = [bracket, brace]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (start != null && start > 0) text = text.slice(start);
  return text;
}

export function coerceCandidateValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = unwrapStructuredDraft(value);
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

export function looksLikeStructuredDraft(value: string): boolean {
  const trimmed = value.trim();
  if (/^```(?:json|javascript|js)?/i.test(trimmed)) return true;
  if (/^["']?\s*(?:\[|{)/.test(trimmed)) return true;
  const unwrapped = unwrapStructuredDraft(trimmed);
  return unwrapped.startsWith('{') || unwrapped.startsWith('[');
}

export function isSameStructuredDraft(left: string, right: string): boolean {
  const unwrappedLeft = unwrapStructuredDraft(left).trim();
  const unwrappedRight = unwrapStructuredDraft(right).trim();
  if (unwrappedLeft && unwrappedLeft === unwrappedRight) return true;
  try {
    return (
      JSON.stringify(coerceCandidateValue(left)) === JSON.stringify(coerceCandidateValue(right))
    );
  } catch {
    return false;
  }
}

export function isCompactPreviewValue(value: string): boolean {
  return value.length <= COMPACT_VALUE_LENGTH && !value.includes('\n');
}

function fromPrimitive(
  key: string,
  value: unknown,
  parentKey?: string
): CandidatePreviewNode | null {
  if (typeof value === 'string' && value.trim()) {
    return {
      kind: 'field',
      label: fieldLabel(key, parentKey),
      value: displayValue(key, value.trim()),
    };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'field', label: fieldLabel(key, parentKey), value: String(value) };
  }
  if (typeof value === 'boolean') {
    return { kind: 'field', label: fieldLabel(key, parentKey), value: value ? '是' : '否' };
  }
  return null;
}

function itemTitle(value: Record<string, unknown>, fallback: string): string {
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (name) return name;
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (title) return title;
  return fallback;
}

function titleOmitKeys(record: Record<string, unknown>, title: string): Set<string> {
  const omit = new Set<string>();
  if (typeof record.name === 'string' && record.name.trim() === title) omit.add('name');
  if (typeof record.title === 'string' && record.title.trim() === title) omit.add('title');
  return omit;
}

function fromUnknown(
  key: string,
  value: unknown,
  depth: number,
  parentKey?: string
): CandidatePreviewNode[] {
  if (isEmpty(value) || depth > MAX_DEPTH) return [];
  const primitive = fromPrimitive(key, value, parentKey);
  if (primitive) return [primitive];

  if (Array.isArray(value)) {
    const primitives = value.filter(
      (item): item is string | number => typeof item === 'string' || typeof item === 'number'
    );
    if (primitives.length === value.length) {
      const text = primitives
        .map((item) => displayValue(key, String(item)))
        .filter(Boolean)
        .join('、');
      return text ? [{ kind: 'field', label: fieldLabel(key, parentKey), value: text }] : [];
    }
    const items = value.flatMap((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return fromUnknown(`${key}-${index + 1}`, item, depth + 1, key);
      }
      const record = item as Record<string, unknown>;
      const title = itemTitle(record, `${fieldLabel(key, parentKey)} ${index + 1}`);
      const omit = key === 'clothing' ? titleOmitKeys(record, title) : new Set<string>();
      const children = fromRecord(record, depth + 1, omit, key);
      return children.length > 0 ? [{ kind: 'item' as const, title, children }] : [];
    });
    return items.length > 0
      ? [{ kind: 'group', label: fieldLabel(key, parentKey), children: items }]
      : [];
  }

  if (typeof value === 'object') {
    const children = fromRecord(value as Record<string, unknown>, depth + 1, new Set(), key);
    return children.length > 0
      ? [{ kind: 'group', label: fieldLabel(key, parentKey), children }]
      : [];
  }

  return [];
}

function fromRecord(
  record: Record<string, unknown>,
  depth: number,
  omitKeys: ReadonlySet<string> = new Set(),
  parentKey?: string
): CandidatePreviewNode[] {
  return Object.entries(record).flatMap(([key, value]) => {
    if (SKIP_KEYS.has(key) || omitKeys.has(key) || isEmpty(value)) return [];
    return fromUnknown(key, value, depth, parentKey);
  });
}

export function buildCandidatePreview(value: unknown): CandidatePreviewNode[] {
  const coerced = coerceCandidateValue(value);
  if (typeof coerced === 'string' && coerced.trim()) {
    return [{ kind: 'field', label: '内容', value: coerced.trim() }];
  }
  if (Array.isArray(coerced)) {
    return coerced.flatMap((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return fromUnknown(`item-${index + 1}`, item, 0);
      }
      const record = item as Record<string, unknown>;
      const children = fromRecord(record, 1);
      return children.length > 0
        ? [{ kind: 'item' as const, title: itemTitle(record, `条目 ${index + 1}`), children }]
        : [];
    });
  }
  if (coerced && typeof coerced === 'object') {
    return fromRecord(coerced as Record<string, unknown>, 0);
  }
  return [];
}
