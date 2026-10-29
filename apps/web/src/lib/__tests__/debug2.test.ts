import { describe, expect, it } from 'vitest';

describe('debug', () => {
  it('debug equality', () => {
    const received = { id: 1, titulo: 'Teste' };
    const expected = { id: 1, titulo: 'Teste' };
    console._logged = true;
    require('fs').writeFileSync('/tmp/debug-result.txt', 'received=' + JSON.stringify(received) + '\nexpected=' + JSON.stringify(expected) + '\n');
    expect(received).toEqual(expected);
  });
});
