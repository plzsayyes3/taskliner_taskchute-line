(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TaskLinerGithubContent = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  async function base64Content(file, readBlob) {
    if (typeof file?.content === 'string' && file.content.trim()) return file.content;
    if (!file?.sha) throw new Error('GitHub応答に本文もBlob SHAもありません');
    if (typeof readBlob !== 'function') throw new Error('空の本文を復旧するBlob読込処理がありません');
    const blob = await readBlob(file.sha);
    if (blob?.encoding === 'base64' && typeof blob.content === 'string' && blob.content.trim()) {
      return blob.content;
    }
    throw new Error(`Git Blob ${file.sha} から本文を取得できません`);
  }

  return { base64Content };
});
