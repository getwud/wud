#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('❌ Error: Missing version argument.');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const changelogDir = path.join(rootDir, 'website', 'docs', 'changelog');
const nextFile = path.join(changelogDir, 'next.md');

if (!fs.existsSync(nextFile)) {
  console.error(`❌ Error: ${nextFile} not found.`);
  process.exit(1);
}

const nextContent = fs.readFileSync(nextFile, 'utf8');

// Extract the release notes after the separator '---' following frontmatter and header
// Structure in next.md is:
// ---
// frontmatter
// ---
//
// # Next (Unreleased)
//
// > Description
//
// ---
//
// <notes>

const parts = nextContent.split(/^---$/m);
let notes = '';
if (parts.length >= 4) {
  notes = parts.slice(3).join('---').trim();
} else if (parts.length >= 3) {
  notes = parts.slice(2).join('---').trim();
} else {
  notes = nextContent.trim();
}

if (!notes) {
  console.warn('⚠️ Warning: No unreleased notes found in next.md.');
}

const major = version.split('.')[0];
const targetChangelogFile = path.join(changelogDir, `v${major}.md`);

const dateStr = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date());

const releaseHeader = `## [${version}](https://github.com/getwud/wud/releases/tag/${version}) · <small>${dateStr}</small>\n\n`;
const releaseBlock = `${releaseHeader}${notes}\n\n---\n\n`;

if (fs.existsSync(targetChangelogFile)) {
  const existingContent = fs.readFileSync(targetChangelogFile, 'utf8');
  // Match header like "Release history and details for the **WUD 8.x** series.\n\n"
  const markerRegex = /(# Version \d+\.x\s*\n\s*Release history and details for the \*\*WUD \d+\.x\*\* series\.\s*\n+)/;
  if (markerRegex.test(existingContent)) {
    const updated = existingContent.replace(markerRegex, `$1${releaseBlock}`);
    fs.writeFileSync(targetChangelogFile, updated, 'utf8');
  } else {
    // Fallback: insert after frontmatter
    const frontmatterMatch = existingContent.match(/^(---\s*[\s\S]*?---\s*)/);
    if (frontmatterMatch) {
      const updated = existingContent.replace(frontmatterMatch[0], `${frontmatterMatch[0]}\n${releaseBlock}`);
      fs.writeFileSync(targetChangelogFile, updated, 'utf8');
    } else {
      fs.writeFileSync(targetChangelogFile, `${releaseBlock}${existingContent}`, 'utf8');
    }
  }
} else {
  // Create new major version changelog file
  const newContent = `---
title: Version ${major}.x
description: Release notes and changelog for WUD version ${major}.x series.
---

# Version ${major}.x

Release history and details for the **WUD ${major}.x** series.

${releaseBlock}`;
  fs.writeFileSync(targetChangelogFile, newContent, 'utf8');
}

// Reset next.md
const resetNext = `---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on \`main\` and will be included in the upcoming release.

---

`;
fs.writeFileSync(nextFile, resetNext, 'utf8');
console.log(`✅ Updated ${targetChangelogFile} and reset next.md for version ${version}`);
