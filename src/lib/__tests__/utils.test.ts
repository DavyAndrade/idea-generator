import { describe, expect, it, vi } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('une classes válidas', () => {
    expect(cn('px-4', 'py-2', 'bg-blue-500')).toBe('px-4 py-2 bg-blue-500');
  });

  it('filtra undefined e null', () => {
    expect(cn('px-4', undefined, 'py-2', null)).toBe('px-4 py-2');
  });

  it('filtra false', () => {
    expect(cn('px-4', false, 'py-2')).toBe('px-4 py-2');
  });

  it('retorna string vazia para inputs vazios', () => {
    expect(cn()).toBe('');
    expect(cn(undefined, null, false)).toBe('');
  });
});
