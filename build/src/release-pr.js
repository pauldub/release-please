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
exports.ReleasePR = void 0;
const constants_1 = require("./constants");
const semver = require("semver");
const conventional_commits_1 = require("./conventional-commits");
const branch_name_1 = require("./util/branch-name");
const release_notes_1 = require("./util/release-notes");
const pull_request_title_1 = require("./util/pull-request-title");
const changelog_1 = require("./updaters/changelog");
const logger_1 = require("./util/logger");
class ReleasePR {
    constructor(options) {
        var _a, _b, _c, _d;
        this.changelogPath = 'CHANGELOG.md';
        this.enableSimplePrereleaseParsing = false;
        this.bumpMinorPreMajor = options.bumpMinorPreMajor || false;
        this.bumpPatchForMinorPreMajor = options.bumpPatchForMinorPreMajor || false;
        this.labels = (_a = options.labels) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_LABELS;
        // undefined represents the root path of the library, if the special
        // '.' path is provided, simply ignore it:
        this.path = options.path !== '.' ? options.path : undefined;
        this.packageName = options.packageName || '';
        this.monorepoTags = options.monorepoTags || false;
        this.releaseAs = options.releaseAs;
        this.snapshot = options.snapshot;
        // drop a `v` prefix if provided:
        this.lastPackageVersion = options.lastPackageVersion
            ? options.lastPackageVersion.replace(/^v/, '')
            : undefined;
        this.gh = options.github;
        this.changelogSections = options.changelogSections;
        this.changelogPath = (_b = options.changelogPath) !== null && _b !== void 0 ? _b : this.changelogPath;
        this.pullRequestTitlePattern = options.pullRequestTitlePattern;
        this.extraFiles = (_c = options.extraFiles) !== null && _c !== void 0 ? _c : [];
        this.forManifestReleaser = (_d = options.skipDependencyUpdates) !== null && _d !== void 0 ? _d : false;
    }
    // A releaser can override this method to automatically detect the
    // packageName from source code (e.g. package.json "name")
    async getPackageName() {
        return {
            name: this.packageName,
            getComponent: () => this.packageName,
        };
    }
    async getOpenPROptions(commits, latestTag) {
        await this.validateConfiguration();
        return this._getOpenPROptions(commits, latestTag);
    }
    async _getOpenPROptions(commits, latestTag) {
        const cc = new conventional_commits_1.ConventionalCommits({
            commits,
            owner: this.gh.owner,
            repository: this.gh.repo,
            bumpMinorPreMajor: this.bumpMinorPreMajor,
            bumpPatchForMinorPreMajor: this.bumpPatchForMinorPreMajor,
            changelogSections: this.changelogSections,
        });
        const candidate = await this.coerceReleaseCandidate(cc, latestTag);
        const changelogEntry = await cc.generateChangelogEntry({
            version: candidate.version,
            currentTag: await this.normalizeTagName(candidate.version),
            previousTag: candidate.previousTag
                ? await this.normalizeTagName(candidate.previousTag)
                : undefined,
        });
        // don't create a release candidate until user facing changes
        // (fix, feat, BREAKING CHANGE) have been made; a CHANGELOG that's
        // one line is a good indicator that there were no interesting commits.
        if (this.changelogEmpty(changelogEntry)) {
            logger_1.logger.warn(`no user facing commits found since ${latestTag ? latestTag.sha : 'beginning of time'}`);
            return undefined;
        }
        const packageName = await this.getPackageName();
        const updates = await this.buildUpdates(changelogEntry, candidate, packageName);
        return {
            sha: commits[0].sha,
            changelogEntry: `${changelogEntry}\n---\n`,
            updates,
            version: candidate.version,
            includePackageName: this.monorepoTags,
        };
    }
    async run() {
        await this.validateConfiguration();
        if (this.snapshot && !this.supportsSnapshots()) {
            logger_1.logger.warn('snapshot releases not supported for this releaser');
            return;
        }
        // TODO: consider switching to this.findMergedRelease()
        const mergedPR = await this.gh.findMergedReleasePR(this.labels, undefined, true, 100);
        if (mergedPR) {
            // a PR already exists in the autorelease: pending state.
            logger_1.logger.warn(`pull #${mergedPR.number} ${mergedPR.sha} has not yet been released`);
            return undefined;
        }
        else {
            return this._run();
        }
    }
    async _run() {
        const packageName = await this.getPackageName();
        const latestTag = await this.latestTag(this.monorepoTags ? `${packageName.getComponent()}-` : undefined, this.enableSimplePrereleaseParsing);
        const commits = await this.commits({
            sha: latestTag ? latestTag.sha : undefined,
            path: this.path,
        });
        const openPROptions = await this.getOpenPROptions(commits, latestTag);
        return openPROptions ? await this.openPR(openPROptions) : undefined;
    }
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.changelogPath,
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        return updates;
    }
    supportsSnapshots() {
        return false;
    }
    async closeStaleReleasePRs(currentPRNumber, includePackageName = false) {
        const prs = await this.gh.findOpenReleasePRs(this.labels);
        const packageName = await this.getPackageName();
        for (let i = 0, pr; i < prs.length; i++) {
            pr = prs[i];
            // don't close the most up-to-date release PR.
            if (pr.number !== currentPRNumber) {
                // on mono repos that maintain multiple open release PRs, we use the
                // pull request title to differentiate between PRs:
                if (includePackageName && !pr.title.includes(` ${packageName.name} `)) {
                    continue;
                }
                logger_1.logger.info(`closing pull #${pr.number}`);
                await this.gh.closePR(pr.number);
            }
        }
    }
    defaultInitialVersion() {
        return this.bumpMinorPreMajor ? '0.1.0' : '1.0.0';
    }
    tagSeparator() {
        return '-';
    }
    async normalizeTagName(versionOrTagName) {
        if (!this.monorepoTags) {
            return versionOrTagName.replace(/^v?/, 'v');
        }
        const pkgName = await this.getPackageName();
        const tagPrefix = pkgName.getComponent() + this.tagSeparator() + 'v';
        const re = new RegExp(`^(${tagPrefix}|)`);
        return versionOrTagName.replace(re, tagPrefix);
    }
    async coerceReleaseCandidate(cc, latestTag, enableSimplePrereleaseParsing = false) {
        var _a, _b;
        const releaseAsRe = /release-as:\s*v?([0-9]+\.[0-9]+\.[0-9a-z]+(-[0-9a-z.]+)?)\s*/i;
        const previousTag = latestTag ? latestTag.name : undefined;
        let version = latestTag ? latestTag.version : this.defaultInitialVersion();
        // If a commit contains the footer release-as: 1.x.x, we use this version
        // from the commit footer rather than the version returned by suggestBump().
        let forcedVersion;
        const releaseAsCommit = cc.parsedCommits.find(element => {
            var _a, _b;
            const bodyMatch = (_a = element.body) === null || _a === void 0 ? void 0 : _a.match(releaseAsRe);
            if (bodyMatch) {
                forcedVersion = bodyMatch[1];
                return true;
            }
            const footerMatch = (_b = element.footer) === null || _b === void 0 ? void 0 : _b.match(releaseAsRe);
            if (footerMatch) {
                forcedVersion = footerMatch[1];
                return true;
            }
            return false;
        });
        if (releaseAsCommit) {
            version = forcedVersion;
        }
        else if (enableSimplePrereleaseParsing) {
            // Handle pre-release format v1.0.0-alpha1, alpha2, etc.
            const [prefix, suffix] = version.split('-');
            const match = suffix === null || suffix === void 0 ? void 0 : suffix.match(/(?<type>[^0-9]+)(?<number>[0-9]+)/);
            const number = Number(((_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.number) || 0) + 1;
            version = `${prefix}-${((_b = match === null || match === void 0 ? void 0 : match.groups) === null || _b === void 0 ? void 0 : _b.type) || 'alpha'}${number}`;
        }
        else if (latestTag && !this.releaseAs) {
            const bump = await cc.suggestBump(version);
            const candidate = semver.inc(version, bump.releaseType);
            if (!candidate)
                throw Error(`failed to increment ${version}`);
            version = candidate;
        }
        else if (this.releaseAs) {
            version = this.releaseAs;
        }
        return { version, previousTag };
    }
    async commits(opts) {
        const sha = opts.sha;
        const perPage = opts.perPage || 100;
        const labels = opts.labels || false;
        const path = opts.path || undefined;
        const commits = await this.gh.commitsSinceSha(sha, perPage, labels, path);
        if (commits.length) {
            logger_1.logger.info(`found ${commits.length} commits since ${sha ? sha : 'beginning of time'}`);
        }
        else {
            logger_1.logger.warn(`no commits found since ${sha}`);
        }
        return commits;
    }
    // Override this method to modify the pull request title
    async buildPullRequestTitle(version, includePackageName) {
        const packageName = await this.getPackageName();
        const pullRequestTitle = includePackageName
            ? pull_request_title_1.PullRequestTitle.ofComponentVersion(packageName.name, version, this.pullRequestTitlePattern)
            : pull_request_title_1.PullRequestTitle.ofVersion(version, this.pullRequestTitlePattern);
        return pullRequestTitle.toString();
    }
    // Override this method to detect the release version from code (if it cannot be
    // inferred from the release PR head branch)
    detectReleaseVersionFromTitle(title) {
        const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(title, this.pullRequestTitlePattern);
        if (pullRequestTitle) {
            return pullRequestTitle.getVersion();
        }
        return undefined;
    }
    // Override this method to modify the pull request head branch name
    // If you modify this, you must ensure that the releaser can parse the tag version
    // from the pull request.
    async buildBranchName(version, includePackageName) {
        const packageName = await this.getPackageName();
        if (includePackageName && packageName) {
            return branch_name_1.BranchName.ofComponentVersion((await this.getPackageName()).getComponent(), version);
        }
        return branch_name_1.BranchName.ofVersion(version);
    }
    // Override this method to modify the pull request body
    async buildPullRequestBody(_version, changelogEntry) {
        return `:robot: I have created a release \\*beep\\* \\*boop\\*\n---\n${changelogEntry}\n\nThis PR was generated with [Release Please](https://github.com/googleapis/${constants_1.RELEASE_PLEASE}). See [documentation](https://github.com/googleapis/${constants_1.RELEASE_PLEASE}#${constants_1.RELEASE_PLEASE}).`;
    }
    async openPR(options) {
        const changelogEntry = options.changelogEntry;
        const updates = options.updates;
        const version = options.version;
        const includePackageName = options.includePackageName;
        const title = await this.buildPullRequestTitle(version, includePackageName);
        const body = await this.buildPullRequestBody(version, changelogEntry);
        const branchName = await this.buildBranchName(version, includePackageName);
        const pr = await this.gh.openPR({
            branch: branchName.toString(),
            updates,
            title,
            body,
            labels: this.labels,
        });
        // a return of undefined indicates that PR was not updated.
        if (pr) {
            await this.gh.addLabels(this.labels, pr);
            logger_1.logger.info(`find stale PRs with label "${this.labels.join(',')}"`);
            await this.closeStaleReleasePRs(pr, includePackageName);
        }
        return pr;
    }
    changelogEmpty(changelogEntry) {
        return changelogEntry.split('\n').length === 1;
    }
    addPath(file) {
        file = file.replace(/^[/\\]/, '');
        if (this.path === undefined) {
            return file;
        }
        else {
            const path = this.path.replace(/[/\\]$/, '');
            return `${path}/${file}`;
        }
    }
    // BEGIN release functionality
    // Override this method to detect the release version from code (if it cannot be
    // inferred from the release PR head branch)
    async detectReleaseVersionFromCode() {
        return undefined;
    }
    async detectReleaseVersion(mergedPR, branchName) {
        // try from branch name
        let version = branchName === null || branchName === void 0 ? void 0 : branchName.getVersion();
        if (version) {
            return version;
        }
        // try from PR title
        version = this.detectReleaseVersionFromTitle(mergedPR.title);
        if (version) {
            return version;
        }
        // detect from code
        return this.detectReleaseVersionFromCode();
    }
    formatReleaseTagName(version, packageName) {
        if (this.monorepoTags) {
            return `${packageName.getComponent()}${this.tagSeparator()}v${version}`;
        }
        return `v${version}`;
    }
    async validateConfiguration() {
        if (this.monorepoTags) {
            const packageName = await this.getPackageName();
            if (packageName.getComponent() === '') {
                throw new Error('package-name required for monorepo releases');
            }
        }
    }
    // Logic for determining what to include in a GitHub release.
    async buildRelease() {
        await this.validateConfiguration();
        const mergedPR = await this.findMergedRelease();
        if (!mergedPR) {
            logger_1.logger.warn('No merged release PR found');
            return undefined;
        }
        const branchName = branch_name_1.BranchName.parse(mergedPR.headRefName);
        const version = await this.detectReleaseVersion(mergedPR, branchName);
        if (!version) {
            logger_1.logger.warn('Unable to detect release version');
            return undefined;
        }
        return this.buildReleaseForVersion(version, mergedPR);
    }
    async buildReleaseForVersion(version, mergedPR) {
        const packageName = await this.getPackageName();
        const tag = this.formatReleaseTagName(version, packageName);
        const changelogContents = (await this.gh.getFileContents(this.addPath(this.changelogPath))).parsedContent;
        const notes = release_notes_1.extractReleaseNotes(changelogContents, version);
        return {
            sha: mergedPR.sha,
            tag,
            notes,
            name: packageName.name,
            version,
            pullNumber: mergedPR.number,
        };
    }
    async findMergedRelease() {
        const targetBranch = await this.gh.getDefaultBranch();
        const component = (await this.getPackageName()).getComponent();
        const filter = this.monorepoTags
            ? (pullRequest) => {
                var _a;
                if (this.labels.length > 0 &&
                    !this.labels.every(label => pullRequest.labels.includes(label))) {
                    return false;
                }
                // in a monorepo, filter PR head branch by component
                return (((_a = branch_name_1.BranchName.parse(pullRequest.headRefName)) === null || _a === void 0 ? void 0 : _a.getComponent()) ===
                    component);
            }
            : (pullRequest) => {
                if (this.labels.length > 0 &&
                    !this.labels.every(label => pullRequest.labels.includes(label))) {
                    return false;
                }
                // accept any release PR head branch pattern
                return !!branch_name_1.BranchName.parse(pullRequest.headRefName);
            };
        return await this.gh.findMergedPullRequest(targetBranch, filter);
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
        // Consider any version with a '-' as a pre-release version
        if (!preRelease && version.indexOf('-') >= 0) {
            return null;
        }
        // Allow the '-' separator to be omitted.
        if (preRelease && !version.includes('-') && version.match(/[a-zB-Z]/)) {
            version = version.replace(/([a-zA-Z])/, '-$1');
        }
        return semver.valid(version);
    }
    /**
     * Find the most recent matching release tag on the branch we're
     * configured for.
     *
     * @param {string} prefix - Limit the release to a specific component.
     * @param {boolean} preRelease - Whether or not to return pre-release
     *   versions. Defaults to false.
     */
    async latestTag(prefix, preRelease = false) {
        const branchPrefix = (prefix === null || prefix === void 0 ? void 0 : prefix.endsWith('-')) ? prefix.replace(/-$/, '')
            : prefix;
        // only look at the last 250 or so commits to find the latest tag - we
        // don't want to scan the entire repository history if this repo has never
        // been released
        const generator = this.gh.mergeCommitIterator(250);
        for await (const commitWithPullRequest of generator) {
            const mergedPullRequest = commitWithPullRequest.pullRequest;
            if (!mergedPullRequest) {
                continue;
            }
            const branchName = branch_name_1.BranchName.parse(mergedPullRequest.headRefName);
            if (!branchName) {
                continue;
            }
            // If branchPrefix is specified, ensure it is found in the branch name.
            // If branchPrefix is not specified, component should also be undefined.
            if (branchName.getComponent() !== branchPrefix) {
                continue;
            }
            const version = await this.detectReleaseVersion(mergedPullRequest, branchName);
            if (!version) {
                continue;
            }
            // Make sure we did get a valid semver.
            const normalizedVersion = this.normalizeVersion(version, preRelease);
            if (!normalizedVersion) {
                continue;
            }
            return {
                name: await this.normalizeTagName(normalizedVersion),
                sha: mergedPullRequest.sha,
                version: normalizedVersion,
            };
        }
        // did not find a recent merged release PR, fallback to tags on the repo
        return await this.gh.latestTagFallback(prefix, preRelease);
    }
}
exports.ReleasePR = ReleasePR;
//# sourceMappingURL=release-pr.js.map