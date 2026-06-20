import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  database: {},
  db: {}
}));

import { getDynamicApiUrl } from '../utils/apiClient';

describe('getDynamicApiUrl helper', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Mock window object
    global.window = {
      location: {
        hostname: 'localhost',
        origin: 'http://localhost:4000',
        port: '4000'
      }
    } as any;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('should return configured URL when window is undefined (SSR)', () => {
    // @ts-ignore
    global.window = undefined;
    const configured = 'https://api.render.com';
    expect(getDynamicApiUrl(configured)).toBe(configured);
  });

  it('should override with window.origin if hostname is localhost', () => {
    const configured = 'https://api.render.com';
    global.window.location.hostname = 'localhost';
    (global.window.location as any).origin = 'http://localhost:4000';
    global.window.location.port = '4000';

    expect(getDynamicApiUrl(configured)).toBe('http://localhost:4000');
  });

  it('should override with window.origin if hostname is 127.0.0.1', () => {
    const configured = 'https://api.render.com';
    global.window.location.hostname = '127.0.0.1';
    (global.window.location as any).origin = 'http://127.0.0.1:4000';
    global.window.location.port = '4000';

    expect(getDynamicApiUrl(configured)).toBe('http://127.0.0.1:4000');
  });

  it('should override with window.origin if hostname is a local class C IP (192.168.1.10)', () => {
    const configured = 'https://api.render.com';
    global.window.location.hostname = '192.168.1.10';
    (global.window.location as any).origin = 'http://192.168.1.10:4000';
    global.window.location.port = '4000';

    expect(getDynamicApiUrl(configured)).toBe('http://192.168.1.10:4000');
  });

  it('should fallback to port 4000 if loaded via Astro dev port 4322 on local address', () => {
    const configured = 'https://api.render.com';
    global.window.location.hostname = '192.168.1.10';
    (global.window.location as any).origin = 'http://192.168.1.10:4322';
    global.window.location.port = '4322';

    expect(getDynamicApiUrl(configured)).toBe('http://192.168.1.10:4000');
  });

  it('should return the configured production URL if loaded from Netlify production site', () => {
    const configured = 'https://api.render.com';
    global.window.location.hostname = 'corner-click-admin.netlify.app';
    (global.window.location as any).origin = 'https://corner-click-admin.netlify.app';
    global.window.location.port = '';

    expect(getDynamicApiUrl(configured)).toBe(configured);
  });
});
