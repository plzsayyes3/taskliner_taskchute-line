((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TaskLinerNotePull = api;
})(globalThis, () => {
  'use strict';

  const CACHE_PREFIX = 'taskliner_note_cache_v1:';

  function normalizeTarget(raw) {
    let target = String(raw || '').trim();
    const alias = target.indexOf('|');
    if (alias >= 0) target = target.slice(0, alias).trim();
    const heading = target.indexOf('#');
    if (heading >= 0) target = target.slice(0, heading).trim();
    target = target.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!target || /[?#]/.test(target)) throw new Error('ノートリンクのパスが空です');

    const parts = target.split('/').map(part => {
      let decoded;
      try { decoded = decodeURIComponent(part).trim(); }
      catch { throw new Error('ノートリンクのURLエンコードが不正です'); }
      if (!decoded || decoded === '.' || decoded === '..' || /[\u0000-\u001f]/.test(decoded)) {
        throw new Error('ノートリンクのパスが不正です');
      }
      return decoded;
    });
    let path = parts.join('/');
    if (!/\.md$/i.test(path)) path += '.md';
    return path;
  }

  function cacheKey(repo, branch, path) {
    return CACHE_PREFIX + [repo, branch, path].map(value => encodeURIComponent(String(value))).join(':');
  }

  function cache(storage, { repo, branch, path, sha, content, pulledAt = new Date().toISOString() }) {
    const key = cacheKey(repo, branch, path);
    storage.setItem(key, JSON.stringify({ repo, branch, path, sha, content, pulledAt }));
    return key;
  }

  return { normalizeTarget, cacheKey, cache };
});
