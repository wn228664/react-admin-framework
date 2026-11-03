export function isExternalPath(path) {
  return /^(https?:|mailto:|tel:)/.test(String(path ?? ''));
}
