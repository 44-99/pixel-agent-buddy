function parseVersion(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.') : []
  };
}

function compareIdentifier(left, right) {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
  if (leftNumber !== null && rightNumber !== null) return Math.sign(leftNumber - rightNumber);
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return left.localeCompare(right);
}

function compareVersions(leftValue, rightValue) {
  const left = parseVersion(leftValue);
  const right = parseVersion(rightValue);
  if (!left || !right) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (left.core[index] !== right.core[index]) return Math.sign(left.core[index] - right.core[index]);
  }
  if (!left.prerelease.length && right.prerelease.length) return 1;
  if (left.prerelease.length && !right.prerelease.length) return -1;
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) return -1;
    if (right.prerelease[index] === undefined) return 1;
    const compared = compareIdentifier(left.prerelease[index], right.prerelease[index]);
    if (compared) return compared;
  }
  return 0;
}

function newestRelease(releases = []) {
  return releases
    .filter((release) => !release.draft && parseVersion(release.tag_name))
    .sort((left, right) => compareVersions(right.tag_name, left.tag_name))[0] || null;
}

function summarizeUpdate(currentVersion, releases) {
  const latest = newestRelease(releases);
  if (!latest) return { currentVersion, available: false, latestVersion: '', url: '' };
  return {
    currentVersion,
    available: compareVersions(latest.tag_name, currentVersion) > 0,
    latestVersion: String(latest.tag_name).replace(/^v/, ''),
    url: latest.html_url || ''
  };
}

module.exports = { compareVersions, newestRelease, parseVersion, summarizeUpdate };
