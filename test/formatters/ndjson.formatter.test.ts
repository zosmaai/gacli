import { describe, expect, it } from 'vitest';
import { formatNdjson } from '../../src/formatters/ndjson.formatter.js';

describe('formatNdjson', () => {
  it('emits one JSON object per row, newline-separated, trailing newline', () => {
    const out = formatNdjson({
      headers: ['country', 'sessions'],
      rows: [
        ['US', '120'],
        ['GB', '34'],
      ],
      rowCount: 2,
    });
    const lines = out.split('\n');
    expect(lines).toHaveLength(3); // 2 records + trailing empty
    expect(lines[2]).toBe('');
    expect(JSON.parse(lines[0])).toEqual({ country: 'US', sessions: '120' });
    expect(JSON.parse(lines[1])).toEqual({ country: 'GB', sessions: '34' });
  });

  it('returns empty string for empty rows (no trailing newline so concatenation is safe)', () => {
    expect(formatNdjson({ headers: ['x'], rows: [], rowCount: 0 })).toBe('');
  });

  it('coerces missing cells to empty string', () => {
    const out = formatNdjson({
      headers: ['a', 'b', 'c'],
      rows: [['x', 'y']],
      rowCount: 1,
    });
    expect(JSON.parse(out.trim())).toEqual({ a: 'x', b: 'y', c: '' });
  });

  it('produces lines that are individually valid JSON (NDJSON contract)', () => {
    const out = formatNdjson({
      headers: ['k'],
      rows: [['v1'], ['v2'], ['v3']],
      rowCount: 3,
    });
    const records = out
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(records).toEqual([{ k: 'v1' }, { k: 'v2' }, { k: 'v3' }]);
  });

  it('escapes special characters per JSON spec', () => {
    const out = formatNdjson({
      headers: ['x'],
      rows: [['a"b\nc']],
      rowCount: 1,
    });
    expect(JSON.parse(out.trim())).toEqual({ x: 'a"b\nc' });
    // Raw line should not contain a literal newline inside the value
    expect(out.split('\n').length).toBe(2); // record + trailing
  });
});
