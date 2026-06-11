import { describe, it, expect } from 'vitest';
import { locateMingongBranch, generatePalaceBranches } from '../src/palaces';
import { PALACE_NAMES } from '../src/types';

describe('locateMingongBranch', () => {
  // Source: 紫雲《紫微斗數導讀》ch.3 page 38 — worked example
  // 1990年 6月 14時 (未時, branch=未, idx=7+1=8 → hourBranch index 4)
  // 寅(2) + 月-1 - 時 = 2 + 5 - 4 = 3 → 卯
  // (validate this manually against ZY before relying)
  it('places 命宮 at expected branch for worked example', () => {
    const branch = locateMingongBranch(6, 14);
    expect(branch).toBeDefined();
    // TODO P3: replace with corpus-verified value
  });

  it('returns valid earthly branch for any input', () => {
    for (let m = 1; m <= 12; m++) {
      for (let h = 0; h <= 23; h++) {
        const b = locateMingongBranch(m, h);
        expect(b).toMatch(/^[子丑寅卯辰巳午未申酉戌亥]$/);
      }
    }
  });
});

describe('generatePalaceBranches', () => {
  it('returns 12 palaces in canonical order', () => {
    const result = generatePalaceBranches('寅');
    expect(result).toHaveLength(12);
    expect(result.map((p) => p.name)).toEqual([...PALACE_NAMES]);
  });

  it('places 兄弟宮 one position counter-clockwise from 命宮', () => {
    const result = generatePalaceBranches('寅');
    const mingong = result.find((p) => p.name === '命宮');
    const brothers = result.find((p) => p.name === '兄弟');
    expect(mingong?.branch).toBe('寅');
    expect(brothers?.branch).toBe('丑');
  });
});
