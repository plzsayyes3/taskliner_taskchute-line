const test = require('node:test');
const assert = require('node:assert/strict');
const GitHubContent = require('./taskliner-github-content.js');

test('uses Contents API base64 content without an extra request', async () => {
  let blobReads = 0;
  const content = await GitHubContent.base64Content(
    { content: 'aGVsbG8=', encoding: 'base64', sha: 'file-sha' },
    async () => { blobReads += 1; }
  );
  assert.equal(content, 'aGVsbG8=');
  assert.equal(blobReads, 0);
});

test('accepts a valid empty Contents API file without an extra request', async () => {
  let blobReads = 0;
  const content = await GitHubContent.base64Content(
    { content: '', encoding: 'base64', sha: 'empty-sha' },
    async () => { blobReads += 1; }
  );
  assert.equal(content, '');
  assert.equal(blobReads, 0);
});

test('recovers an omitted Contents API payload from its Git blob', async () => {
  const content = await GitHubContent.base64Content(
    { content: '', encoding: 'none', sha: 'blob-sha' },
    async sha => {
      assert.equal(sha, 'blob-sha');
      return { content: 'aGVsbG8=', encoding: 'base64' };
    }
  );
  assert.equal(content, 'aGVsbG8=');
});

test('accepts an empty base64 Git blob as a valid empty file', async () => {
  const content = await GitHubContent.base64Content(
    { content: '', encoding: 'none', sha: 'empty-blob-sha' },
    async () => ({ content: '', encoding: 'base64' })
  );
  assert.equal(content, '');
});

test('reports malformed or missing Git blob content clearly', async () => {
  await assert.rejects(
    GitHubContent.base64Content({ content: '', sha: 'blob-sha' }, async () => ({ content: '', encoding: 'none' })),
    /本文を取得できません/
  );
  await assert.rejects(
    GitHubContent.base64Content({ content: '' }, async () => null),
    /Blob SHAもありません/
  );
});
