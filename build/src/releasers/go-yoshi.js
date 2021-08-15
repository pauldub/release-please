"use strict";
// Copyright 2020 Google LLC
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
exports.GoYoshi = void 0;
const release_pr_1 = require("../release-pr");
const conventional_commits_1 = require("../conventional-commits");
// Generic
const changelog_1 = require("../updaters/changelog");
const logger_1 = require("../util/logger");
// Commits containing a scope prefixed with an item in this array will be
// ignored when generating a release PR for the parent module.
const SUB_MODULES = [
    'bigtable',
    'bigquery',
    'datastore',
    'firestore',
    'logging',
    'pubsub',
    'pubsublite',
    'spanner',
    'storage',
];
const REGEN_PR_REGEX = /.*auto-regenerate.*/;
class GoYoshi extends release_pr_1.ReleasePR {
    constructor() {
        super(...arguments);
        this.changelogPath = 'CHANGES.md';
    }
    async _run() {
        const packageName = await this.getPackageName();
        const latestTag = await this.latestTag(this.monorepoTags ? `${packageName.getComponent()}-` : undefined, false);
        let regenPR;
        let sha = null;
        const commits = (await this.commits({
            sha: latestTag === null || latestTag === void 0 ? void 0 : latestTag.sha,
            path: this.path,
        })).filter(commit => {
            var _a, _b;
            // Store the very first SHA returned, this represents the HEAD of the
            // release being created:
            if (!sha) {
                sha = commit.sha;
            }
            if (this.gh.repo === 'google-api-go-client' &&
                REGEN_PR_REGEX.test(commit.message)) {
                // Only have a single entry of the nightly regen listed in the changelog.
                // If there are more than one of these commits, append associated PR.
                const issueRe = /(?<prefix>.*)\((?<pr>.*)\)(\n|$)/;
                if (regenPR) {
                    const match = commit.message.match(issueRe);
                    if ((_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.pr) {
                        regenPR.message += `\nRefs ${match.groups.pr}`;
                    }
                    return false;
                }
                else {
                    // Throw away the sha for nightly regens, will just append PR numbers.
                    commit.sha = null;
                    regenPR = commit;
                    const match = commit.message.match(issueRe);
                    if ((_b = match === null || match === void 0 ? void 0 : match.groups) === null || _b === void 0 ? void 0 : _b.pr) {
                        regenPR.message = `${match.groups.prefix}\n\nRefs ${match.groups.pr}`;
                    }
                }
            }
            return true;
        });
        const cc = new conventional_commits_1.ConventionalCommits({
            commits: commits,
            owner: this.gh.owner,
            repository: this.gh.repo,
            bumpMinorPreMajor: this.bumpMinorPreMajor,
            commitFilter: this.filterSubModuleCommits(this.gh.repo, packageName.name),
        });
        const candidate = await this.coerceReleaseCandidate(cc, latestTag);
        // "closes" is a little presumptuous, let's just indicate that the
        // PR references these other commits:
        const changelogEntry = (await cc.generateChangelogEntry({
            version: candidate.version,
            currentTag: await this.normalizeTagName(candidate.version),
            previousTag: candidate.previousTag
                ? await this.normalizeTagName(candidate.previousTag)
                : undefined,
        })).replace(/, closes /g, ', refs ');
        // don't create a release candidate until user facing changes
        // (fix, feat, BREAKING CHANGE) have been made; a CHANGELOG that's
        // one line is a good indicator that there were no interesting commits.
        if (this.changelogEmpty(changelogEntry)) {
            logger_1.logger.warn(`no user facing commits found since ${latestTag ? latestTag.sha : 'beginning of time'}`);
            return undefined;
        }
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        if (!sha) {
            throw Error('no sha found for pull request');
        }
        return await this.openPR({
            sha: sha,
            changelogEntry,
            updates,
            version: candidate.version,
            includePackageName: this.monorepoTags,
        });
    }
    isGapicRepo(repo) {
        return repo === 'google-cloud-go';
    }
    isMultiClientRepo(repo) {
        return repo === 'google-cloud-go' || repo === 'google-api-go-client';
    }
    defaultInitialVersion() {
        return '0.1.0';
    }
    tagSeparator() {
        return '/';
    }
    filterSubModuleCommits(repo, packageName) {
        return (c) => {
            if (this.isGapicRepo(repo)) {
                // Filter commits that don't have a scope as we don't know where to put
                // them.
                if (!c.scope) {
                    return true;
                }
                // Skipping commits related to sub-modules as they are not apart of the
                // parent module.
                if (!this.monorepoTags) {
                    for (const subModule of SUB_MODULES) {
                        if (c.scope === subModule || c.scope.startsWith(subModule + '/')) {
                            return true;
                        }
                    }
                }
                else {
                    if (!(c.scope === packageName || c.scope.startsWith(packageName + '/'))) {
                        return true;
                    }
                }
            }
            return false;
        };
    }
}
exports.GoYoshi = GoYoshi;
//# sourceMappingURL=go-yoshi.js.map