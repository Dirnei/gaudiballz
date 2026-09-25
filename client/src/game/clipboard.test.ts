import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  it('copies through the clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    await copyText('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('never opens a share sheet, even where one exists', async () => {
    const share = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    await copyText('hello');

    expect(share).not.toHaveBeenCalled();
  });
});
