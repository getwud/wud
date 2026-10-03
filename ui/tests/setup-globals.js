if (typeof global.CSS === 'undefined') {
  global.CSS = {
    supports: () => false,
    escape: (s) => s,
  };
}
