const test = require('node:test');
const assert = require('node:assert/strict');
const Pull = require('./task-note-pull.js');

test('normalizes wiki links into note paths, excluding heading and alias', () => {
  assert.equal(Pull.normalizeTarget('02_techo/2026-09#予定|9月の手帳'), '02_techo/2026-09.md');
  assert.equal(Pull.normalizeTarget('02_techo/2026-09.md'), '02_techo/2026-09.md');
});

test('rejects empty, traversal, and malformed encoded note paths', () => {
  for (const target of ['', '../secrets', 'folder/%2e%2e/secrets', 'folder/%E0%A4%A']) {
    assert.throws(() => Pull.normalizeTarget(target));
  }
});

test('resolves a pathless wiki link to its unique Markdown note path', () => {
  assert.deepEqual(Pull.resolvePath('2026-09.md', ['02_techo/2026-09.md', 'other/readme.md']), {
    path: '02_techo/2026-09.md', candidates: ['02_techo/2026-09.md']
  });
});

test('preserves explicit note paths and reports ambiguous basename matches', () => {
  assert.deepEqual(Pull.resolvePath('02_techo/2026-09.md', ['02_techo/2026-09.md', 'other/2026-09.md']), {
    path: '02_techo/2026-09.md', candidates: ['02_techo/2026-09.md']
  });
  assert.deepEqual(Pull.resolvePath('2026-09.md', ['02_techo/2026-09.md', 'other/2026-09.md']), {
    path: null, candidates: ['02_techo/2026-09.md', 'other/2026-09.md']
  });
});

test('separates local note caches by repository, branch, and path', () => {
  const first = Pull.cacheKey('owner/notebook', 'main', '02_techo/2026-09.md');
  assert.notEqual(first, Pull.cacheKey('owner/notebook', 'main', '02_techo/2026-10.md'));
  assert.notEqual(first, Pull.cacheKey('owner/notebook', 'draft', '02_techo/2026-09.md'));
  assert.notEqual(first, Pull.cacheKey('owner/other', 'main', '02_techo/2026-09.md'));
});

test('stores only the pulled note body and its identifying metadata', () => {
  const entries = new Map();
  const storage = { setItem: (key, value) => entries.set(key, String(value)) };
  const key = Pull.cache(storage, {
    repo: 'owner/notebook', branch: 'main', path: '02_techo/2026-09.md',
    sha: 'abc123', content: '# September', pulledAt: '2026-09-23T00:00:00.000Z'
  });
  assert.equal(entries.size, 1);
  assert.deepEqual(JSON.parse(entries.get(key)), {
    repo: 'owner/notebook', branch: 'main', path: '02_techo/2026-09.md',
    sha: 'abc123', content: '# September', pulledAt: '2026-09-23T00:00:00.000Z'
  });
});
