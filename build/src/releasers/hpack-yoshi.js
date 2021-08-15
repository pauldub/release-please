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
exports.HPackYoshi = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const release_pr_1 = require("../release-pr");
const conventional_commits_1 = require("../conventional-commits");
const indent_commit_1 = require("../util/indent-commit");
const changelog_1 = require("../updaters/changelog");
const version_hpack_1 = require("../updaters/version-hpack");
const logger_1 = require("../util/logger");
const CHANGELOG_SECTIONS = [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'revert', section: 'Reverts' },
    { type: 'docs', section: 'Documentation' },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'chore', section: 'Miscellaneous Chores', hidden: true },
    { type: 'refactor', section: 'Code Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'build', section: 'Build System', hidden: true },
    { type: 'ci', section: 'Continuous Integration', hidden: true },
];
class HPackYoshi extends release_pr_1.ReleasePR {
    async _run() {
        const packageName = await this.getPackageName();
        const lastReleaseSha = this.lastPackageVersion
            ? await this.gh.getTagSha(`${packageName.getComponent()}/v${this.lastPackageVersion}`)
            : undefined;
        const commits = await this.commits({
            sha: lastReleaseSha,
            path: packageName.name,
        });
        if (commits.length === 0) {
            logger_1.logger.warn(`no commits found since ${lastReleaseSha}`);
            return undefined;
        }
        else {
            const cc = new conventional_commits_1.ConventionalCommits({
                commits: postProcessCommits(commits),
                owner: this.gh.owner,
                repository: this.gh.repo,
                bumpMinorPreMajor: this.bumpMinorPreMajor,
                commitPartial: fs_1.readFileSync(path_1.resolve(__dirname, '../../../templates/commit.hbs'), 'utf8'),
                headerPartial: fs_1.readFileSync(path_1.resolve(__dirname, '../../../templates/header.hbs'), 'utf8'),
                mainTemplate: fs_1.readFileSync(path_1.resolve(__dirname, '../../../templates/template.hbs'), 'utf8'),
                changelogSections: CHANGELOG_SECTIONS,
            });
            const githubTag = this.lastPackageVersion
                ? {
                    version: this.lastPackageVersion,
                    name: this.lastPackageVersion,
                }
                : undefined;
            const candidate = await this.coerceReleaseCandidate(cc, githubTag);
            const changelogEntry = await cc.generateChangelogEntry({
                version: candidate.version,
                currentTag: `v${candidate.version}`,
                previousTag: undefined,
            });
            // don't create a release candidate until user facing changes
            // (fix, feat, BREAKING CHANGE) have been made; a CHANGELOG that's
            // one line is a good indicator that there were no interesting commits.
            if (this.changelogEmpty(changelogEntry)) {
                logger_1.logger.warn(`no user facing commits found since ${lastReleaseSha ? lastReleaseSha : 'beginning of time'}`);
                return undefined;
            }
            const updates = [];
            updates.push(new changelog_1.Changelog({
                path: `${packageName.name}/CHANGELOG.md`,
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
            updates.push(new version_hpack_1.VersionHPack({
                path: `${packageName.name}/package.yaml`,
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
            return await this.openPR({
                sha: commits[0].sha,
                changelogEntry: `${changelogEntry}\n---\n${this.summarizeCommits(lastReleaseSha, commits, packageName.name)}\n`,
                updates,
                version: candidate.version,
                includePackageName: true,
            });
        }
    }
    // create a summary of the commits landed since the last release,
    // for the benefit of the release PR.
    summarizeCommits(lastReleaseSha, commits, packageName) {
        // summarize the commits that landed:
        let summary = '### Commits since last release:\n\n';
        const updatedFiles = {};
        const repoUrl = `${this.gh.owner}/${this.gh.repo}`;
        commits.forEach(commit => {
            if (commit.sha === null)
                return;
            const splitMessage = commit.message.split('\n');
            summary += `* [${splitMessage[0]}](https://github.com/${repoUrl}/commit/${commit.sha})\n`;
            if (splitMessage.length > 2) {
                summary = `${summary}<pre><code>${splitMessage
                    .slice(1)
                    .join('\n')}</code></pre>\n`;
            }
            commit.files.forEach(file => {
                if (file.startsWith(packageName)) {
                    updatedFiles[file] = true;
                }
            });
        });
        // summarize the files that changed:
        summary = `${summary}\n### Files edited since last release:\n\n<pre><code>`;
        Object.keys(updatedFiles).forEach(file => {
            summary += `${file}\n`;
        });
        return `${summary}</code></pre>\n[Compare Changes](https://github.com/${repoUrl}/compare/${lastReleaseSha}...HEAD)\n`;
    }
}
exports.HPackYoshi = HPackYoshi;
function postProcessCommits(commits) {
    commits.forEach(commit => {
        commit.message = indent_commit_1.indentCommit(commit);
    });
    return commits;
}
//# sourceMappingURL=hpack-yoshi.js.map