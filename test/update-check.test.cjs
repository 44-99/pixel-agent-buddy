const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions, newestRelease, parseVersion, summarizeUpdate } = require('../src/update-check.cjs');

test('compares stable and prerelease semantic versions', () => {
  assert.deepEqual(parseVersion('v0.2.1-beta.2').core, [0, 2, 1]);
  assert.equal(compareVersions('0.2.1-beta.2', '0.2.1-beta.1') > 0, true);
  assert.equal(compareVersions('0.2.1', '0.2.1-beta.9') > 0, true);
  assert.equal(compareVersions('0.3.0', '0.2.9') > 0, true);
});

test('ignores drafts and reports the newest published release', () => {
  const releases = [
    { tag_name: 'v0.2.2', draft: true, html_url: 'draft' },
    { tag_name: 'v0.2.1-beta.1', draft: false, html_url: 'new' },
    { tag_name: 'v0.2.0', draft: false, html_url: 'old' }
  ];
  assert.equal(newestRelease(releases).html_url, 'new');
  assert.deepEqual(summarizeUpdate('0.2.0-beta.2', releases), {
    currentVersion: '0.2.0-beta.2', available: true,
    latestVersion: '0.2.1-beta.1', url: 'new'
  });
});
