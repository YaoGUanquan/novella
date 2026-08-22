import {
  appearanceColorSwatch,
  isBodyTypeSelectValue,
  isHeightSelectValue,
  normalizeBodyTypeValue,
  normalizeHeightValue,
} from '@/features/character-consistency/appearance-form';

describe('appearance form helpers', () => {
  it('maps chinese color names to hex for the color swatch', () => {
    expect(appearanceColorSwatch('黑色', '#000000')).toBe('#1A1A1A');
    expect(appearanceColorSwatch('黑褐色', '#000000')).toBe('#3B2F2F');
    expect(appearanceColorSwatch('白皙', '#F5D6BA')).toBe('#F5D6BA');
    expect(appearanceColorSwatch('#2C2C2C', '#000000')).toBe('#2C2C2C');
  });

  it('keeps numeric height out of the categorical select', () => {
    expect(normalizeHeightValue(175)).toBe(175);
    expect(normalizeHeightValue('175cm')).toBe('175');
    expect(normalizeHeightValue('中等')).toBe('average');
    expect(isHeightSelectValue('average')).toBe(true);
    expect(isHeightSelectValue('175')).toBe(false);
  });

  it('maps thin to slim so the body type select can show a value', () => {
    expect(normalizeBodyTypeValue('thin')).toBe('slim');
    expect(normalizeBodyTypeValue('偏瘦')).toBe('slim');
    expect(isBodyTypeSelectValue('slim')).toBe(true);
    expect(isBodyTypeSelectValue('thin')).toBe(false);
  });
});
