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
exports.JavaYoshi = void 0;
const branch_name_1 = require("../util/branch-name");
const pull_request_title_1 = require("../util/pull-request-title");
const versions_manifest_1 = require("../updaters/java/versions-manifest");
const conventional_commits_1 = require("../conventional-commits");
const version_1 = require("./java/version");
const release_pr_1 = require("../release-pr");
const changelog_1 = require("../updaters/changelog");
const readme_1 = require("../updaters/java/readme");
const google_utils_1 = require("../updaters/java/google-utils");
const pom_xml_1 = require("../updaters/java/pom-xml");
const java_update_1 = require("../updaters/java/java_update");
const stability_1 = require("./java/stability");
const bump_type_1 = require("./java/bump_type");
const logger_1 = require("../util/logger");
const errors_1 = require("../errors");
const CHANGELOG_SECTIONS = [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'deps', section: 'Dependencies' },
    { type: 'revert', section: 'Reverts' },
    { type: 'docs', section: 'Documentation' },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'chore', section: 'Miscellaneous Chores', hidden: true },
    { type: 'refactor', section: 'Code Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'build', section: 'Build System', hidden: true },
    { type: 'ci', section: 'Continuous Integration', hidden: true },
];
class JavaYoshi extends release_pr_1.ReleasePR {
    async getVersionManifestContent() {
        if (!this.versionsManifestContent) {
            try {
                this.versionsManifestContent = await this.gh.getFileContents('versions.txt');
            }
            catch (e) {
                if (e instanceof errors_1.GitHubAPIError) {
                    if (e.status === 404) {
                        // on missing file, throw a configuration error
                        throw new errors_1.MissingRequiredFileError('versions.txt', JavaYoshi.name, this.gh.repo);
                    }
                }
                throw e;
            }
        }
        return this.versionsManifestContent;
    }
    async _run() {
        const versionsManifestContent = await this.getVersionManifestContent();
        const currentVersions = versions_manifest_1.VersionsManifest.parseVersions(versionsManifestContent.parsedContent);
        const snapshotNeeded = versions_manifest_1.VersionsManifest.needsSnapshot(versionsManifestContent.parsedContent);
        if (!this.snapshot) {
            // if a snapshot is not explicitly requested, decided what type
            // of release based on whether a snapshot is needed or not
            this.snapshot = snapshotNeeded;
        }
        else if (!snapshotNeeded) {
            logger_1.logger.warn('release asked for a snapshot, but no snapshot is needed');
            return undefined;
        }
        if (this.snapshot) {
            this.labels = ['type: process'];
        }
        const latestTag = await this.latestTag();
        const commits = this.snapshot
            ? [
                {
                    sha: 'abc123',
                    message: 'fix: ',
                    files: [],
                },
            ]
            : await this.commits({
                sha: latestTag ? latestTag.sha : undefined,
                labels: true,
            });
        if (commits.length === 0) {
            logger_1.logger.warn(`no commits found since ${latestTag ? latestTag.sha : 'beginning of time'}`);
            return undefined;
        }
        let prSHA = commits[0].sha;
        // Snapshots populate a fake "fix:"" commit, so that they will always
        // result in a patch update. We still need to know the HEAD sba, so that
        // we can use this as a starting point for the snapshot PR:
        if (this.snapshot && (latestTag === null || latestTag === void 0 ? void 0 : latestTag.sha)) {
            const latestCommit = (await this.commits({
                sha: latestTag.sha,
                perPage: 1,
                labels: true,
            }))[0];
            prSHA = latestCommit ? latestCommit.sha : latestTag.sha;
        }
        const cc = new conventional_commits_1.ConventionalCommits({
            commits,
            owner: this.gh.owner,
            repository: this.gh.repo,
            bumpMinorPreMajor: this.bumpMinorPreMajor,
            changelogSections: CHANGELOG_SECTIONS,
        });
        const candidate = await this.coerceReleaseCandidate(cc, latestTag);
        const candidateVersions = await this.coerceVersions(cc, candidate, latestTag, currentVersions);
        const changelogEntry = await this.generateChangelog(cc, candidate);
        // don't create a release candidate until user facing changes
        // (fix, feat, BREAKING CHANGE) have been made; a CHANGELOG that's
        // one line is a good indicator that there were no interesting commits.
        if (this.changelogEmpty(changelogEntry) && !this.snapshot) {
            logger_1.logger.warn(`no user facing commits found since ${latestTag ? latestTag.sha : 'beginning of time'}`);
            return undefined;
        }
        const packageName = await this.getPackageName();
        const updates = await this.buildJavaUpdates(changelogEntry, candidateVersions, candidate, packageName);
        return await this.openPR({
            sha: prSHA,
            changelogEntry: `${changelogEntry}\n---\n`,
            updates,
            version: candidate.version,
            includePackageName: this.monorepoTags,
        });
    }
    async generateChangelog(cc, candidate) {
        if (this.snapshot) {
            return '### Updating meta-information for bleeding-edge SNAPSHOT release.';
        }
        return await cc.generateChangelogEntry({
            version: candidate.version,
            currentTag: `v${candidate.version}`,
            previousTag: candidate.previousTag,
        });
    }
    async coerceReleaseCandidate(cc, latestTag, preRelease = false) {
        var _a;
        if (this.snapshot) {
            const version = version_1.Version.parse((_a = latestTag === null || latestTag === void 0 ? void 0 : latestTag.version) !== null && _a !== void 0 ? _a : this.defaultInitialVersion())
                .bump('snapshot')
                .toString();
            return {
                previousTag: latestTag === null || latestTag === void 0 ? void 0 : latestTag.version,
                version,
            };
        }
        return await super.coerceReleaseCandidate(cc, latestTag, preRelease);
    }
    async buildJavaUpdates(changelogEntry, candidateVersions, candidate, packageName) {
        const updates = [];
        if (!this.snapshot) {
            updates.push(new changelog_1.Changelog({
                path: this.changelogPath,
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
            updates.push(new readme_1.Readme({
                path: 'README.md',
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
            updates.push(new google_utils_1.GoogleUtils({
                // TODO(@chingor): should this use search like pom.xml?
                path: 'google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java',
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
        }
        updates.push(new versions_manifest_1.VersionsManifest({
            path: 'versions.txt',
            changelogEntry,
            versions: candidateVersions,
            version: candidate.version,
            packageName: packageName.name,
            contents: await this.getVersionManifestContent(),
        }));
        const pomFilesSearch = this.gh.findFilesByFilename('pom.xml');
        const buildFilesSearch = this.gh.findFilesByFilename('build.gradle');
        const dependenciesSearch = this.gh.findFilesByFilename('dependencies.properties');
        const pomFiles = await pomFilesSearch;
        pomFiles.forEach(path => {
            updates.push(new pom_xml_1.PomXML({
                path,
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        const buildFiles = await buildFilesSearch;
        buildFiles.forEach(path => {
            updates.push(new java_update_1.JavaUpdate({
                path,
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        const dependenciesFiles = await dependenciesSearch;
        dependenciesFiles.forEach(path => {
            updates.push(new java_update_1.JavaUpdate({
                path,
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        this.extraFiles.forEach(path => {
            updates.push(new java_update_1.JavaUpdate({
                path,
                changelogEntry,
                versions: candidateVersions,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        return updates;
    }
    supportsSnapshots() {
        return true;
    }
    defaultInitialVersion() {
        return '0.1.0';
    }
    async coerceVersions(cc, candidate, _latestTag, currentVersions) {
        const newVersions = new Map();
        for (const [k, version] of currentVersions) {
            if (candidate.version === '1.0.0' && stability_1.isStableArtifact(k)) {
                newVersions.set(k, '1.0.0');
            }
            else {
                const bump = await cc.suggestBump(version);
                const newVersion = version_1.Version.parse(version);
                newVersion.bump(this.snapshot ? 'snapshot' : bump_type_1.fromSemverReleaseType(bump.releaseType));
                newVersions.set(k, newVersion.toString());
            }
        }
        return newVersions;
    }
    // Begin release configuration
    // Override this method to use static branch names
    // If you modify this, you must ensure that the releaser can parse the tag version
    // from the pull request.
    async buildBranchName(_version, includePackageName) {
        const defaultBranch = await this.gh.getDefaultBranch();
        const packageName = await this.getPackageName();
        if (includePackageName && packageName.getComponent()) {
            return branch_name_1.BranchName.ofComponentTargetBranch(packageName.getComponent(), defaultBranch);
        }
        return branch_name_1.BranchName.ofTargetBranch(defaultBranch);
    }
    // Override this method to modify the pull request title
    async buildPullRequestTitle(version, includePackageName) {
        const defaultBranch = await this.gh.getDefaultBranch();
        const repoDefaultBranch = await this.gh.getRepositoryDefaultBranch();
        // If we are proposing a release to a non-default branch, add the target
        // branch in the pull request title.
        // TODO: consider pushing this change up to the default pull request title
        if (repoDefaultBranch === defaultBranch) {
            return super.buildPullRequestTitle(version, includePackageName);
        }
        const packageName = await this.getPackageName();
        const pullRequestTitle = includePackageName
            ? pull_request_title_1.PullRequestTitle.ofComponentTargetBranchVersion(packageName.name, defaultBranch, version)
            : pull_request_title_1.PullRequestTitle.ofTargetBranchVersion(defaultBranch, version);
        return pullRequestTitle.toString();
    }
    /**
     * Normalize version parsing when searching for a latest release.
     *
     * @param version The raw version string
     * @param preRelease Whether to allow pre-release versions or not
     * @returns {string|null} The normalized version string or null if
     *   we want to disallow this version.
     */
    normalizeVersion(version, preRelease = false) {
        // Consider any version with a '-SNAPSHOT' as a pre-release version
        if (!preRelease && version.endsWith('-SNAPSHOT')) {
            logger_1.logger.info('preRelease not requested and found snapshot - ignoring...');
            return null;
        }
        return version;
    }
}
exports.JavaYoshi = JavaYoshi;
//# sourceMappingURL=java-yoshi.js.map