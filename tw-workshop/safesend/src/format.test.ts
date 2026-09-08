import { describe, expect, it } from 'vitest';
import { formatSettingsValue } from './format';

// The audit log used to print a checking-amount change as "10000 -> 50000".
describe('formatSettingsValue', () => {
  it('formats *Cents fields as money', () => {
    expect(formatSettingsValue('approvalThresholdCents', 10_000)).toBe('€100.00');
    expect(formatSettingsValue('approvalThresholdCents', 50_000)).toBe('€500.00');
    expect(formatSettingsValue('dailyLimitCents', 100_000)).toBe('€1,000.00');
  });

  it('says on/off rather than true/false', () => {
    expect(formatSettingsValue('blockCriticalOutright', true)).toBe('on');
    expect(formatSettingsValue('secondContactActive', false)).toBe('off');
  });

  it('leaves non-money, non-boolean values alone', () => {
    expect(formatSettingsValue('approverRemoved', 'Jean Okafor')).toBe('Jean Okafor');
    expect(formatSettingsValue('approverReplaced', undefined)).toBe('—');
  });

  it('does not treat a plain number field as money', () => {
    expect(formatSettingsValue('someCount', 12)).toBe('12');
  });
});
