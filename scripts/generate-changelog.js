const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

const packageJson = require(packageJsonPath);
const version = packageJson.version;
const date = new Date().toISOString().split('T')[0];

const template = `\n## [v${version}] - ${date}

### Added
- [Details here]

### Changed
- [Details here]

### Fixed
- [Details here]

`;

let existingChangelog = '';
if (fs.existsSync(changelogPath)) {
    existingChangelog = fs.readFileSync(changelogPath, 'utf8');
} else {
    existingChangelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
}

if (existingChangelog.startsWith('# Changelog\n')) {
    // Try to insert after the preamble
    const preambleMatch = existingChangelog.match(/^# Changelog\n+All notable changes to this project will be documented in this file\.\n+/i);
    if (preambleMatch) {
        const preamble = preambleMatch[0];
        const rest = existingChangelog.substring(preamble.length);
        const newContent = `${preamble}${template}${rest}`;
        fs.writeFileSync(changelogPath, newContent, 'utf8');
    } else {
        // Just split by first line
        const parts = existingChangelog.split('\n');
        const newContent = `${parts[0]}\n\n${template}${parts.slice(1).join('\n')}`;
        fs.writeFileSync(changelogPath, newContent, 'utf8');
    }
} else {
    fs.writeFileSync(changelogPath, template + existingChangelog, 'utf8');
}

console.log(`Generated changelog entry for v${version}`);
