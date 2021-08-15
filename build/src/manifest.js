"use strict";
// Copyright 2021 Google LLC
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
exports.Manifest = void 0;
const commit_split_1 = require("./commit-split");
const constants_1 = require("./constants");
const branch_name_1 = require("./util/branch-name");
const _1 = require(".");
const release_please_manifest_1 = require("./updaters/release-please-manifest");
const checkpoint_1 = require("./util/checkpoint");
const github_release_1 = require("./github-release");
const plugins_1 = require("./plugins");
class Manifest {
    constructor(options) {
        this.gh = options.github;
        this.configFileName = options.configFile || constants_1.RELEASE_PLEASE_CONFIG;
        this.manifestFileName = options.manifestFile || constants_1.RELEASE_PLEASE_MANIFEST;
        this.checkpoint = options.checkpoint || checkpoint_1.checkpoint;
    }
    async getBranchName() {
        return branch_name_1.BranchName.ofTargetBranch(await this.gh.getDefaultBranch());
    }
    async getFileJson(fileName, sha) {
        let content;
        try {
            if (sha) {
                content = await this.gh.getFileContentsWithSimpleAPI(fileName, sha, false);
            }
            else {
                content = await this.gh.getFileContents(fileName);
            }
        }
        catch (e) {
            this.checkpoint(`Failed to get ${fileName} at ${sha !== null && sha !== void 0 ? sha : 'HEAD'}: ${e.status}`, checkpoint_1.CheckpointType.Failure);
            // If a sha is provided this is a request for the manifest file at the
            // last merged Release PR. The only reason it would not exist is if a user
            // checkedout that branch and deleted the manifest file right before
            // merging. There is no recovery from that so we'll fall back to using
            // the manifest at the tip of the defaultBranch.
            if (sha === undefined) {
                // !sha means this is a request against the tip of the defaultBranch and
                // we require that the manifest and config exist there. If they don't,
                // they can be added and this exception will not be thrown.
                throw e;
            }
            return;
        }
        return JSON.parse(content.parsedContent);
    }
    async getManifestJson(sha) {
        // cache headManifest since it's loaded in validate() as well as later on
        // and we never write to it.
        let manifest;
        if (sha === undefined) {
            if (!this.headManifest) {
                this.headManifest = await this.getFileJson(this.manifestFileName);
            }
            manifest = this.headManifest;
        }
        else {
            manifest = await this.getFileJson(this.manifestFileName, sha);
        }
        return manifest;
    }
    async getManifestVersions(sha, newPaths) {
        let manifestJson;
        const defaultBranch = await this.gh.getDefaultBranch();
        const bootstrapMsg = `Bootstrapping from ${this.manifestFileName} ` +
            `at tip of ${defaultBranch}`;
        if (sha === undefined) {
            this.checkpoint(bootstrapMsg, checkpoint_1.CheckpointType.Failure);
        }
        if (sha === false) {
            this.checkpoint(`${bootstrapMsg} for missing paths [${newPaths.join(', ')}]`, checkpoint_1.CheckpointType.Failure);
        }
        let atSha = 'tip';
        if (!sha) {
            manifestJson = await this.getManifestJson();
        }
        else {
            // try to retrieve manifest from last release sha.
            const maybeManifestJson = await this.getManifestJson(sha);
            atSha = sha;
            if (maybeManifestJson === undefined) {
                // user deleted manifest from last release PR before merging.
                this.checkpoint(bootstrapMsg, checkpoint_1.CheckpointType.Failure);
                manifestJson = await this.getManifestJson();
                atSha = 'tip';
            }
            else {
                manifestJson = maybeManifestJson;
            }
        }
        const parsed = new Map(Object.entries(manifestJson));
        if (sha === false) {
            return parsed;
        }
        else {
            return [parsed, atSha];
        }
    }
    async getConfigJson() {
        var _a, _b, _c, _d, _e, _f;
        // cache config since it's loaded in validate() as well as later on and we
        // never write to it.
        if (!this.configFile) {
            const config = await this.getFileJson(this.configFileName);
            const packages = [];
            for (const pkgPath in config.packages) {
                const pkgCfg = config.packages[pkgPath];
                const pkg = {
                    path: pkgPath,
                    releaseType: (_b = (_a = pkgCfg['release-type']) !== null && _a !== void 0 ? _a : config['release-type']) !== null && _b !== void 0 ? _b : 'node',
                    packageName: pkgCfg['package-name'],
                    bumpMinorPreMajor: (_c = pkgCfg['bump-minor-pre-major']) !== null && _c !== void 0 ? _c : config['bump-minor-pre-major'],
                    bumpPatchForMinorPreMajor: (_d = pkgCfg['bump-patch-for-minor-pre-major']) !== null && _d !== void 0 ? _d : config['bump-patch-for-minor-pre-major'],
                    changelogSections: (_e = pkgCfg['changelog-sections']) !== null && _e !== void 0 ? _e : config['changelog-sections'],
                    changelogPath: pkgCfg['changelog-path'],
                    releaseAs: this.resolveReleaseAs(pkgCfg['release-as'], config['release-as']),
                    draft: (_f = pkgCfg['draft']) !== null && _f !== void 0 ? _f : config['draft'],
                };
                packages.push(pkg);
            }
            this.configFile = { parsedPackages: packages, ...config };
        }
        return this.configFile;
    }
    // Default release-as only considered if non-empty string.
    // Per-pkg release-as may be:
    //   1. undefined: use default release-as if present, otherwise normal version
    //      resolution (auto-increment from CC, fallback to defaultInitialVersion)
    //   1. non-empty string: use this version
    //   2. empty string: override default release-as if present, otherwise normal
    //      version resolution.
    resolveReleaseAs(pkgRA, defaultRA) {
        let releaseAs;
        if (defaultRA) {
            releaseAs = defaultRA;
        }
        if (pkgRA !== undefined) {
            releaseAs = pkgRA;
        }
        if (!releaseAs) {
            releaseAs = undefined;
        }
        return releaseAs;
    }
    async getPackagesToRelease(allCommits, sha) {
        const packages = (await this.getConfigJson()).parsedPackages;
        const [manifestVersions, atSha] = await this.getManifestVersions(sha);
        const cs = new commit_split_1.CommitSplit({
            includeEmpty: true,
            packagePaths: packages.map(p => p.path),
        });
        const commitsPerPath = cs.split(allCommits);
        const packagesToRelease = {};
        const missingVersionPaths = [];
        const defaultBranch = await this.gh.getDefaultBranch();
        for (const pkg of packages) {
            // The special path of '.' indicates the root module is being released
            // in this case, use the entire list of commits:
            const commits = pkg.path === '.' ? allCommits : commitsPerPath[pkg.path];
            if (!commits || commits.length === 0) {
                continue;
            }
            const lastVersion = manifestVersions.get(pkg.path);
            if (!lastVersion) {
                this.checkpoint(`Failed to find version for ${pkg.path} in ` +
                    `${this.manifestFileName} at ${atSha} of ${defaultBranch}`, checkpoint_1.CheckpointType.Failure);
                missingVersionPaths.push(pkg.path);
            }
            else {
                this.checkpoint(`Found version ${lastVersion} for ${pkg.path} in ` +
                    `${this.manifestFileName} at ${atSha} of ${defaultBranch}`, checkpoint_1.CheckpointType.Success);
            }
            packagesToRelease[pkg.path] = {
                commits,
                lastVersion,
                config: pkg,
            };
        }
        if (missingVersionPaths.length > 0) {
            const headManifestVersions = await this.getManifestVersions(false, missingVersionPaths);
            for (const missingVersionPath of missingVersionPaths) {
                const headVersion = headManifestVersions.get(missingVersionPath);
                if (headVersion === undefined) {
                    this.checkpoint(`Failed to find version for ${missingVersionPath} in ` +
                        `${this.manifestFileName} at tip of ${defaultBranch}`, checkpoint_1.CheckpointType.Failure);
                }
                packagesToRelease[missingVersionPath].lastVersion = headVersion;
            }
        }
        return Object.values(packagesToRelease);
    }
    async validateJsonFile(getFileMethod, fileName) {
        let response = {
            valid: false,
            obj: undefined,
        };
        try {
            const obj = await this[getFileMethod]();
            if (obj.constructor.name === 'Object') {
                response = { valid: true, obj: obj };
            }
        }
        catch (e) {
            let errMsg;
            if (e instanceof SyntaxError) {
                errMsg = `Invalid JSON in ${fileName}`;
            }
            else {
                errMsg = `Unable to ${getFileMethod}(${fileName}): ${e.message}`;
            }
            this.checkpoint(errMsg, checkpoint_1.CheckpointType.Failure);
        }
        return response;
    }
    async validate() {
        var _a;
        const configValidation = await this.validateJsonFile('getConfigJson', this.configFileName);
        let validConfig = false;
        if (configValidation.valid) {
            const obj = configValidation.obj;
            validConfig = !!Object.keys((_a = obj.packages) !== null && _a !== void 0 ? _a : {}).length;
            if (!validConfig) {
                this.checkpoint(`No packages found: ${this.configFileName}`, checkpoint_1.CheckpointType.Failure);
            }
        }
        const manifestValidation = await this.validateJsonFile('getManifestJson', this.manifestFileName);
        let validManifest = false;
        if (manifestValidation.valid) {
            validManifest = true;
            const versions = new Map(Object.entries(manifestValidation.obj));
            for (const [_, version] of versions) {
                if (typeof version !== 'string') {
                    validManifest = false;
                    this.checkpoint(`${this.manifestFileName} must only contain string values`, checkpoint_1.CheckpointType.Failure);
                    break;
                }
            }
        }
        return validConfig && validManifest;
    }
    async getReleasePR(pkg) {
        const { releaseType, draft, ...options } = pkg;
        const releaserOptions = {
            monorepoTags: true,
            ...options,
        };
        const releaserClass = _1.factory.releasePRClass(releaseType);
        const releasePR = new releaserClass({
            github: this.gh,
            skipDependencyUpdates: true,
            ...releaserOptions,
        });
        return [releasePR, draft];
    }
    async runReleasers(packagesForReleasers, sha) {
        const newManifestVersions = new Map();
        const pkgsWithChanges = [];
        for (const pkg of packagesForReleasers) {
            const [releasePR] = await this.getReleasePR(pkg.config);
            const pkgName = await releasePR.getPackageName();
            const displayTag = `${releasePR.constructor.name}(${pkgName.name})`;
            this.checkpoint(`Processing package: ${displayTag}`, checkpoint_1.CheckpointType.Success);
            if (pkg.lastVersion === undefined) {
                this.checkpoint(`Falling back to default version for ${displayTag}: ` +
                    releasePR.defaultInitialVersion(), checkpoint_1.CheckpointType.Failure);
            }
            const openPROptions = await releasePR.getOpenPROptions(pkg.commits, pkg.lastVersion
                ? {
                    name: pkgName.getComponent() +
                        releasePR.tagSeparator() +
                        'v' +
                        pkg.lastVersion,
                    sha: sha !== null && sha !== void 0 ? sha : 'beginning of time',
                    version: pkg.lastVersion,
                }
                : undefined);
            if (openPROptions) {
                pkg.config.packageName = (await releasePR.getPackageName()).name;
                const changes = await this.gh.getChangeSet(openPROptions.updates, await this.gh.getDefaultBranch());
                pkgsWithChanges.push({
                    config: pkg.config,
                    prData: { version: openPROptions.version, changes },
                });
                newManifestVersions.set(pkg.config.path, openPROptions.version);
            }
        }
        return [newManifestVersions, pkgsWithChanges];
    }
    async getManifestChanges(newManifestVersions) {
        // TODO: simplify `Update.contents?` to just be a string - no need to
        // roundtrip through a GitHubFileContents
        const manifestContents = {
            sha: '',
            parsedContent: '',
            content: Buffer.from(JSON.stringify(await this.getManifestJson())).toString('base64'),
        };
        const manifestUpdate = new release_please_manifest_1.ReleasePleaseManifest({
            changelogEntry: '',
            packageName: '',
            path: this.manifestFileName,
            version: '',
            versions: newManifestVersions,
            contents: manifestContents,
        });
        return await this.gh.getChangeSet([manifestUpdate], await this.gh.getDefaultBranch());
    }
    buildPRBody(pkg) {
        var _a, _b;
        const version = pkg.prData.version;
        let body = '<details><summary>' +
            `${pkg.config.packageName}: ${version}` +
            '</summary>';
        let changelogPath = (_a = pkg.config.changelogPath) !== null && _a !== void 0 ? _a : 'CHANGELOG.md';
        if (pkg.config.path !== '.') {
            changelogPath = `${pkg.config.path}/${changelogPath}`;
        }
        const changelog = (_b = pkg.prData.changes.get(changelogPath)) === null || _b === void 0 ? void 0 : _b.content;
        if (!changelog) {
            this.checkpoint(`Failed to find ${changelogPath}`, checkpoint_1.CheckpointType.Failure);
        }
        else {
            const match = changelog.match(
            // changelog entries start like
            // ## 1.0.0 (1983...
            // ## [4.0.0](https...
            // ### [1.2.4](https...
            RegExp(`.*###? \\[?${version}\\]?.*?\n(?<currentEntry>.*?)` +
                // either the next changelog or new lines / spaces to the end if
                // this is the first entry in the changelog
                '(\n###? [0-9[].*|[\n ]*$)', 's'));
            if (!match) {
                this.checkpoint(`Failed to find entry in changelog for ${version}`, checkpoint_1.CheckpointType.Failure);
            }
            else {
                const { currentEntry } = match.groups;
                body += '\n\n\n' + currentEntry.trim() + '\n';
            }
        }
        body += '</details>\n';
        return body;
    }
    async buildManifestPR(newManifestVersions, 
    // using version, changes
    packages) {
        let body = ':robot: I have created a release \\*beep\\* \\*boop\\*\n---\n';
        let changes = new Map();
        for (const pkg of packages) {
            body += this.buildPRBody(pkg);
            changes = new Map([...changes, ...pkg.prData.changes]);
        }
        const manifestChanges = await this.getManifestChanges(newManifestVersions);
        changes = new Map([...changes, ...manifestChanges]);
        body +=
            '\n\nThis PR was generated with [Release Please]' +
                `(https://github.com/googleapis/${constants_1.RELEASE_PLEASE}). See [documentation]` +
                `(https://github.com/googleapis/${constants_1.RELEASE_PLEASE}#${constants_1.RELEASE_PLEASE}).`;
        return [body, changes];
    }
    async getPlugins() {
        var _a;
        const plugins = [];
        const config = await this.getConfigJson();
        for (const p of (_a = config.plugins) !== null && _a !== void 0 ? _a : []) {
            plugins.push(plugins_1.getPlugin(p, this.gh, config));
        }
        return plugins;
    }
    async resolveLastReleaseSha(branchName) {
        const config = await this.getConfigJson();
        let lastReleaseSha;
        let source = 'no last release sha found';
        if (config['last-release-sha']) {
            lastReleaseSha = config['last-release-sha'];
            source = 'last-release-sha';
        }
        else {
            const lastMergedPR = await this.gh.lastMergedPRByHeadBranch(branchName);
            if (lastMergedPR) {
                lastReleaseSha = lastMergedPR.sha;
                source = 'last-release-pr';
            }
            else if (config['bootstrap-sha']) {
                lastReleaseSha = config['bootstrap-sha'];
                source = 'bootstrap-sha';
            }
        }
        this.checkpoint(`Found last release sha "${lastReleaseSha}" using "${source}"`, checkpoint_1.CheckpointType.Success);
        return lastReleaseSha;
    }
    async pullRequest() {
        const valid = await this.validate();
        if (!valid) {
            return;
        }
        const branchName = (await this.getBranchName()).toString();
        const lastReleaseSha = await this.resolveLastReleaseSha(branchName);
        const commits = await this.gh.commitsSinceShaRest(lastReleaseSha);
        const packagesForReleasers = await this.getPackagesToRelease(commits, lastReleaseSha);
        let [newManifestVersions, pkgsWithChanges] = await this.runReleasers(packagesForReleasers, lastReleaseSha);
        if (pkgsWithChanges.length === 0) {
            this.checkpoint('No user facing changes to release', checkpoint_1.CheckpointType.Success);
            return;
        }
        for (const plugin of await this.getPlugins()) {
            [newManifestVersions, pkgsWithChanges] = await plugin.run(newManifestVersions, pkgsWithChanges);
        }
        const [body, changes] = await this.buildManifestPR(newManifestVersions, pkgsWithChanges);
        const pr = await this.gh.openPR({
            branch: branchName,
            title: `chore: release ${await this.gh.getDefaultBranch()}`,
            body: body,
            updates: [],
            labels: constants_1.DEFAULT_LABELS,
            changes,
        });
        if (pr) {
            await this.gh.addLabels(constants_1.DEFAULT_LABELS, pr);
        }
        return pr;
    }
    async githubRelease() {
        var _a;
        const valid = await this.validate();
        if (!valid) {
            return;
        }
        const branchName = (await this.getBranchName()).toString();
        const lastMergedPR = await this.gh.lastMergedPRByHeadBranch(branchName);
        if (lastMergedPR === undefined) {
            this.checkpoint('Unable to find last merged Manifest PR for tagging', checkpoint_1.CheckpointType.Failure);
            return;
        }
        if (lastMergedPR.labels.includes(github_release_1.GITHUB_RELEASE_LABEL)) {
            this.checkpoint('Releases already created for last merged release PR', checkpoint_1.CheckpointType.Success);
            return;
        }
        if (!lastMergedPR.labels.includes(constants_1.DEFAULT_LABELS[0])) {
            this.checkpoint(`Warning: last merged PR(#${lastMergedPR.number}) is missing ` +
                `label "${constants_1.DEFAULT_LABELS[0]}" but has not yet been ` +
                `labeled "${github_release_1.GITHUB_RELEASE_LABEL}". If PR(#${lastMergedPR.number}) ` +
                'is meant to be a release PR, please apply the ' +
                `label "${constants_1.DEFAULT_LABELS[0]}".`, checkpoint_1.CheckpointType.Failure);
            return;
        }
        const packagesForReleasers = await this.getPackagesToRelease(
        // use the lastMergedPR.sha as a Commit: lastMergedPR.files will inform
        // getPackagesToRelease() what packages had changes (i.e. at least one
        // file under their path changed in the lastMergedPR such as
        // "packages/mypkg/package.json"). These are exactly the packages we want
        // to create releases/tags for.
        [{ sha: lastMergedPR.sha, message: '', files: lastMergedPR.files }], lastMergedPR.sha);
        const releases = {};
        let allReleasesCreated = !!packagesForReleasers.length;
        for (const pkg of packagesForReleasers) {
            const [releasePR, draft] = await this.getReleasePR(pkg.config);
            const pkgName = (await releasePR.getPackageName()).name;
            const pkgLogDisp = `${releasePR.constructor.name}(${pkgName})`;
            if (!pkg.lastVersion) {
                // a user manually modified the manifest file on the release branch
                // right before merging it and deleted the entry for this pkg.
                this.checkpoint(`Unable to find last version for ${pkgLogDisp}.`, checkpoint_1.CheckpointType.Failure);
                releases[pkg.config.path] = undefined;
                continue;
            }
            this.checkpoint('Creating release for ' + `${pkgLogDisp}@${pkg.lastVersion}`, checkpoint_1.CheckpointType.Success);
            const releaser = new github_release_1.GitHubRelease({
                github: this.gh,
                releasePR,
                draft,
            });
            let release;
            try {
                release = await releaser.createRelease(pkg.lastVersion, lastMergedPR);
            }
            catch (err) {
                // There is no transactional bulk create releases API. Previous runs
                // may have failed due to transient infrastructure problems part way
                // through creating releases. Here we skip any releases that were
                // already successfully created.
                //
                // Note about `draft` releases: The GitHub API Release unique key is
                // `tag_name`. However, if `draft` is true, no git tag is created. Thus
                // multiple `draft` releases can be created with the exact same inputs.
                // (It's a tad confusing because `tag_name` still comes back populated
                // in these calls but the tag doesn't actually exist).
                // A draft release can even be created with a `tag_name` referring to an
                // existing tag referenced by another release.
                // However, GitHub will prevent "publishing" any draft release that
                // would cause a duplicate tag to be created. release-please manifest
                // users specifying the "release-draft" option could run into this
                // duplicate releases scenario. It's easy enough to just delete the
                // duplicate draft entries in the UI (or API).
                if (err.status === 422 && ((_a = err.errors) === null || _a === void 0 ? void 0 : _a.length)) {
                    if (err.errors[0].code === 'already_exists' &&
                        err.errors[0].field === 'tag_name') {
                        this.checkpoint(`Release for ${pkgLogDisp}@${pkg.lastVersion} already exists`, checkpoint_1.CheckpointType.Success);
                    }
                }
                else {
                    // PR will not be tagged with GITHUB_RELEASE_LABEL so another run
                    // can try again.
                    allReleasesCreated = false;
                    await this.gh.commentOnIssue(`:robot: Failed to create release for ${pkgName} :cloud:`, lastMergedPR.number);
                    this.checkpoint('Failed to create release for ' +
                        `${pkgLogDisp}@${pkg.lastVersion}: ${err.message}`, checkpoint_1.CheckpointType.Failure);
                }
                releases[pkg.config.path] = undefined;
                continue;
            }
            if (release) {
                await this.gh.commentOnIssue(`:robot: Release for ${pkgName} is at ${release.html_url} :sunflower:`, lastMergedPR.number);
                releases[pkg.config.path] = releaser.releaseResponse({
                    release,
                    version: pkg.lastVersion,
                    sha: lastMergedPR.sha,
                    number: lastMergedPR.number,
                });
            }
        }
        if (allReleasesCreated) {
            await this.gh.addLabels([github_release_1.GITHUB_RELEASE_LABEL], lastMergedPR.number);
            await this.gh.removeLabels(constants_1.DEFAULT_LABELS, lastMergedPR.number);
        }
        return releases;
    }
}
exports.Manifest = Manifest;
//# sourceMappingURL=manifest.js.map