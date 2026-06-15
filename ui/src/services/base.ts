export function url(path: string): string {
  const basePath: string = (window as any).__WUD_BASE_PATH__ || '/';
  return `${basePath}${path}`.replace(/\/\//g, '/');
}
