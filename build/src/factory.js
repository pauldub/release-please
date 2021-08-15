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
exports.factory = void 0;
// Factory shared by GitHub Action and CLI for creating Release PRs
// and GitHub Releases:
const release_pr_1 = require("./release-pr");
const github_release_1 = require("./github-release");
const releasers_1 = require("./releasers");
const github_1 = require("./github");
const constants_1 = require("./constants");
const manifest_1 = require("./manifest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parseGithubRepoUrl = require('parse-github-repo-url');
function isManifestCmd(cmdOpts) {
    const { command, options } = cmdOpts;
    return ((command === 'manifest-pr' || command === 'manifest-release') &&
        typeof options === 'object');
}
function isGitHubReleaseCmd(cmdOpts) {
    const { command, options } = cmdOpts;
    return command === 'github-release' && typeof options === 'object';
}
function isReleasePRCmd(cmdOpts) {
    const { command, options } = cmdOpts;
    return ((command === 'release-pr' || command === 'latest-tag') &&
        typeof options === 'object');
}
function runCommand(command, options) {
    const errMsg = `Invalid command(${command}) with options(${JSON.stringify(options)})`;
    let result;
    const cmdOpts = { command, options };
    if (isManifestCmd(cmdOpts)) {
        const m = manifest(cmdOpts.options);
        if (cmdOpts.command === 'manifest-pr') {
            result = exports.factory.call(m, 'pullRequest');
        }
        else if (cmdOpts.command === 'manifest-release') {
            result = exports.factory.call(m, 'githubRelease');
        }
        else {
            throw new Error(errMsg);
        }
    }
    else if (isGitHubReleaseCmd(cmdOpts)) {
        result = exports.factory.call(githubRelease(cmdOpts.options), 'run');
    }
    else if (isReleasePRCmd(cmdOpts)) {
        const releasePr = releasePR(cmdOpts.options);
        if (cmdOpts.command === 'release-pr') {
            result = exports.factory.call(releasePr, 'run');
        }
        else if (cmdOpts.command === 'latest-tag') {
            result = exports.factory.call(releasePr, 'latestTag');
        }
        else {
            throw new Error(errMsg);
        }
    }
    else {
        throw new Error(errMsg);
    }
    return result;
}
function call(instance, method) {
    if (!(method in instance)) {
        throw new Error(`No such method(${method}) on ${instance.constructor.name}`);
    }
    let result;
    if (instance instanceof manifest_1.Manifest) {
        result = instance[method]();
    }
    else if (instance instanceof release_pr_1.ReleasePR) {
        result = instance[method]();
    }
    else if (instance instanceof github_release_1.GitHubRelease) {
        result = instance[method]();
    }
    else {
        throw new Error('Unknown instance.');
    }
    return result;
}
function getLabels(label) {
    return label ? label.split(',') : constants_1.DEFAULT_LABELS;
}
function getGitHubFactoryOpts(options) {
    const { repoUrl, defaultBranch, fork, token, apiUrl, octokitAPIs, ...remaining } = options;
    return [
        {
            repoUrl,
            defaultBranch,
            fork,
            token,
            apiUrl,
            octokitAPIs,
        },
        remaining,
    ];
}
function manifest(options) {
    const [GHFactoryOptions, ManifestFactoryOptions] = getGitHubFactoryOpts(options);
    const github = gitHubInstance(GHFactoryOptions);
    return new manifest_1.Manifest({ github, ...ManifestFactoryOptions });
}
function githubRelease(options) {
    const [GHFactoryOptions, GHRAndRPFactoryOptions] = getGitHubFactoryOpts(options);
    const github = gitHubInstance(GHFactoryOptions);
    const { releaseType, label, path, packageName, bumpMinorPreMajor, releaseAs, snapshot, monorepoTags, changelogSections, changelogPath, lastPackageVersion, versionFile, ...GHRFactoryOptions } = GHRAndRPFactoryOptions;
    const labels = getLabels(label);
    const releasePR = new (releasePRClass(releaseType))({
        github,
        labels,
        path,
        packageName,
        bumpMinorPreMajor,
        releaseAs,
        snapshot,
        monorepoTags,
        changelogSections,
        changelogPath,
        lastPackageVersion,
        versionFile,
    });
    return new github_release_1.GitHubRelease({ github, releasePR, ...GHRFactoryOptions });
}
function releasePR(options) {
    const [GHFactoryOptions, RPFactoryOptions] = getGitHubFactoryOpts(options);
    const github = gitHubInstance(GHFactoryOptions);
    const { releaseType, label, ...RPConstructorOptions } = RPFactoryOptions;
    const labels = getLabels(label);
    return new (exports.factory.releasePRClass(releaseType))({
        github,
        labels,
        ...RPConstructorOptions,
    });
}
function gitHubInstance(options) {
    const { repoUrl, ...remaining } = options;
    const [owner, repo] = parseGithubRepoUrl(repoUrl);
    return new github_1.GitHub({
        owner,
        repo,
        ...remaining,
    });
}
function releasePRClass(releaseType) {
    const releasers = releasers_1.getReleasers();
    const releaser = releaseType ? releasers[releaseType] : release_pr_1.ReleasePR;
    return releaser;
}
exports.factory = {
    gitHubInstance,
    githubRelease,
    manifest,
    releasePR,
    releasePRClass,
    call,
    runCommand,
};
//# sourceMappingURL=factory.js.map