"use strict";
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHPYoshi = void 0;
const release_pr_1 = require("../release-pr");
const conventional_commits_1 = require("../conventional-commits");
const commit_split_1 = require("../commit-split");
const semver = require("semver");
// Generic
const changelog_1 = require("../updaters/changelog");
// Yoshi PHP Monorepo
const php_client_version_1 = require("../updaters/php-client-version");
const php_manifest_1 = require("../updaters/php-manifest");
const version_1 = require("../updaters/version");
const logger_1 = require("../util/logger");
const root_composer_update_packages_1 = require("../updaters/root-composer-update-packages");
const CHANGELOG_SECTIONS = [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'revert', section: 'Reverts' },
    { type: 'docs', section: 'Documentation' },
    { type: 'chore', section: 'Miscellaneous Chores' },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'refactor', section: 'Code Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'build', section: 'Build System', hidden: true },
    { type: 'ci', section: 'Continuous Integration', hidden: true },
];
class PHPYoshi extends release_pr_1.ReleasePR {
    async _run() {
        const latestTag = await this.latestTag();
        const commits = await this.commits({
            sha: latestTag ? latestTag.sha : undefined,
        });
        // we create an instance of conventional CHANGELOG for bumping the
        // top-level tag version we maintain on the mono-repo itself.
        const ccb = new conventional_commits_1.ConventionalCommits({
            commits,
            owner: this.gh.owner,
            repository: this.gh.repo,
            bumpMinorPreMajor: true,
            changelogSections: CHANGELOG_SECTIONS,
        });
        const candidate = await this.coerceReleaseCandidate(ccb, latestTag);
        // partition a set of packages in the mono-repo that need to be
        // updated since our last release -- the set of string keys
        // is sorted to ensure consistency in the CHANGELOG.
        const updates = [];
        let changelogEntry = `## ${candidate.version}`;
        const bulkUpdate = await this.releaseAllPHPLibraries(commits, updates, changelogEntry);
        changelogEntry = bulkUpdate.changelogEntry;
        const packageName = await this.getPackageName();
        // update the aggregate package information in the root
        // composer.json and manifest.json.
        updates.push(new root_composer_update_packages_1.RootComposerUpdatePackages({
            path: 'composer.json',
            changelogEntry,
            version: candidate.version,
            versions: bulkUpdate.versionUpdates,
            packageName: packageName.name,
        }));
        updates.push(new php_manifest_1.PHPManifest({
            path: 'docs/manifest.json',
            changelogEntry,
            version: candidate.version,
            versions: bulkUpdate.versionUpdates,
            packageName: packageName.name,
        }));
        updates.push(new changelog_1.Changelog({
            path: this.changelogPath,
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        ['src/Version.php', 'src/ServiceBuilder.php'].forEach((path) => {
            updates.push(new php_client_version_1.PHPClientVersion({
                path,
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        return await this.openPR({
            sha: commits[0].sha,
            changelogEntry,
            updates,
            version: candidate.version,
            includePackageName: this.monorepoTags,
        });
    }
    async releaseAllPHPLibraries(commits, updates, changelogEntry) {
        const cs = new commit_split_1.CommitSplit();
        const commitLookup = cs.split(commits);
        const pkgKeys = Object.keys(commitLookup).sort();
        // map of library names that need to be updated in the top level
        // composer.json and manifest.json.
        const versionUpdates = new Map();
        // walk each individual library updating the VERSION file, and
        // if necessary the `const VERSION` in the client library.
        for (let i = 0; i < pkgKeys.length; i++) {
            const pkgKey = pkgKeys[i];
            const cc = new conventional_commits_1.ConventionalCommits({
                commits: commitLookup[pkgKey],
                owner: this.gh.owner,
                repository: this.gh.repo,
                bumpMinorPreMajor: this.bumpMinorPreMajor,
                changelogSections: CHANGELOG_SECTIONS,
            });
            // some packages in the mono-repo might have only had chores,
            // build updates, etc., applied.
            if (!this.changelogEmpty(await cc.generateChangelogEntry({ version: '0.0.0' }))) {
                try {
                    const contents = await this.gh.getFileContents(`${pkgKey}/VERSION`);
                    const bump = await cc.suggestBump(contents.parsedContent);
                    const candidate = semver.inc(contents.parsedContent, bump.releaseType);
                    if (!candidate) {
                        logger_1.logger.error(`failed to update ${pkgKey} version`);
                        continue;
                    }
                    const meta = JSON.parse((await this.gh.getFileContents(`${pkgKey}/composer.json`))
                        .parsedContent);
                    versionUpdates.set(meta.name, candidate);
                    changelogEntry = updatePHPChangelogEntry(`${meta.name} ${candidate}`, changelogEntry, await cc.generateChangelogEntry({ version: candidate }));
                    const packageName = await this.getPackageName();
                    updates.push(new version_1.Version({
                        path: `${pkgKey}/VERSION`,
                        changelogEntry,
                        version: candidate,
                        packageName: packageName.name,
                        contents,
                    }));
                    // extra.component indicates an entry-point class file
                    // that must have its version # updatd.
                    if (meta.extra &&
                        meta.extra.component &&
                        meta.extra.component.entry) {
                        updates.push(new php_client_version_1.PHPClientVersion({
                            path: `${pkgKey}/${meta.extra.component.entry}`,
                            changelogEntry,
                            version: candidate,
                            packageName: packageName.name,
                        }));
                    }
                }
                catch (err) {
                    if (err.status === 404) {
                        // if the updated path has no VERSION, assume this isn't a
                        // module that needs updating.
                        continue;
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
        return { changelogEntry, versionUpdates };
    }
}
exports.PHPYoshi = PHPYoshi;
function updatePHPChangelogEntry(pkgKey, changelogEntry, entryUpdate) {
    {
        // Remove the first line of the entry, in favor of <summary>.
        // This also allows us to use the same regex for extracting release
        // notes (since the string "## v0.0.0" doesn't show up multiple times).
        const entryUpdateSplit = entryUpdate.split(/\r?\n/);
        entryUpdateSplit.shift();
        entryUpdate = entryUpdateSplit.join('\n');
    }
    return `${changelogEntry}

<details><summary>${pkgKey}</summary>

${entryUpdate}

</details>`;
}
//# sourceMappingURL=php-yoshi.js.map