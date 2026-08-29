// Set runtime public path for webpack dynamic chunk loading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const basePath = ((window as any).__WUD_BASE_PATH__ || "/").replace(/\/?$/, "/");
// eslint-disable-next-line camelcase
__webpack_public_path__ = basePath;
