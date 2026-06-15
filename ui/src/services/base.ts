const basePath: string = (window as any).__WUD_BASE_PATH__ || '/';

export function url(path: string): string {
  return `${basePath}${path}`.replace(/\/\//g, '/');
}
