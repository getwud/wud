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

  // Update website/sidebars.ts if new major version
  const sidebarsFile = path.join(rootDir, 'website', 'sidebars.ts');
  if (fs.existsSync(sidebarsFile)) {
    let sidebarsContent = fs.readFileSync(sidebarsFile, 'utf8');
    if (!sidebarsContent.includes(`changelog/v${major}`)) {
      // Demote existing Current label
      sidebarsContent = sidebarsContent.replace(/label:\s*'v\d+\.x \(Current\)'/g, (m) => m.replace(' (Current)', ''));
      // Insert new version after changelog/next
      const nextDocPattern = /(id:\s*'changelog\/next',\s*\n\s*label:\s*'[^']+',\s*\n\s*},)/;
      const newEntry = `$1\n        {\n          type: 'doc',\n          id: 'changelog/v${major}',\n          label: 'v${major}.x (Current)',\n        },`;
      sidebarsContent = sidebarsContent.replace(nextDocPattern, newEntry);
      fs.writeFileSync(sidebarsFile, sidebarsContent, 'utf8');
      console.log(`✅ Updated ${sidebarsFile} with changelog/v${major}`);
    }
  }

  // Update website/docs/changelog/README.md table if new major version
  const changelogReadmeFile = path.join(changelogDir, 'README.md');
  if (fs.existsSync(changelogReadmeFile)) {
    let readmeContent = fs.readFileSync(changelogReadmeFile, 'utf8');
    if (!readmeContent.includes(`**v${major}.x**`)) {
      // Demote existing Current in table to Maintenance
      readmeContent = readmeContent.replace(/(\|\s*\*\*v\d+\.x\*\*\s*\|\s*)\*\*Current\*\*/g, '$1Maintenance');
      // Insert new version row after Next row
      const nextRowPattern = /(\|\s*\*\*Next\*\*\s*\|[^\n]+\n)/;
      const newRow = `$1| **v${major}.x** | **Current** | [${version}](https://github.com/getwud/wud/releases/tag/${version}) (${dateStr}) | [**View v${major}.x Changelog →**](./v${major}.md) |\n`;
      readmeContent = readmeContent.replace(nextRowPattern, newRow);
      fs.writeFileSync(changelogReadmeFile, readmeContent, 'utf8');
      console.log(`✅ Updated ${changelogReadmeFile} with v${major}.x`);
    }
  }
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

