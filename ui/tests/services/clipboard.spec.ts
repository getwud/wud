import { copyToClipboard } from '@/services/clipboard';

describe('clipboard service', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    document.execCommand = originalExecCommand;
    jest.restoreAllMocks();
  });

  it('copies using navigator.clipboard when available and working', async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const result = await copyToClipboard('test value');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('test value');
  });

  it('converts null/undefined values to empty string', async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const result = await copyToClipboard(null as any);
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('');
  });

  it('falls back to document.execCommand when navigator.clipboard is undefined (non-secure context)', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const execCommandMock = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('fallback value');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('falls back to document.execCommand when navigator.clipboard.writeText rejects (e.g. Wayland / permissions)', async () => {
    const writeTextMock = jest.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const execCommandMock = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('wayland value');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('wayland value');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('returns false when both navigator.clipboard and execCommand fail', async () => {
    const writeTextMock = jest.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const execCommandMock = jest.fn().mockReturnValue(false);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('failed value');
    expect(result).toBe(false);
  });

  it('returns false when document.execCommand throws an exception', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    document.execCommand = jest.fn().mockImplementation(() => {
      throw new Error('execCommand error');
    });

    const result = await copyToClipboard('error value');
    expect(result).toBe(false);
  });
});
