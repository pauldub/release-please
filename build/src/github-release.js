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
exports.GitHubRelease = exports.GITHUB_RELEASE_LABEL = void 0;
const semver_1 = require("semver");
const logger_1 = require("./util/logger");
exports.GITHUB_RELEASE_LABEL = 'autorelease: tagged';
class GitHubRelease {
    constructor(options) {
        var _a;
        this.draft = !!options.draft;
        this.gh = options.github;
        this.releasePR = options.releasePR;
        this.releaseLabel = (_a = options.releaseLabel) !== null && _a !== void 0 ? _a : exports.GITHUB_RELEASE_LABEL;
    }
    async createRelease(version, mergedPR) {
        let candidate;
        if (version && mergedPR) {
            candidate = await this.releasePR.buildReleaseForVersion(version, mergedPR);
            return await this.gh.createRelease(candidate.name, candidate.tag, candidate.sha, candidate.notes, this.draft);
        }
        else {
            candidate = await this.releasePR.buildRelease();
        }
        if (candidate !== undefined) {
            const release = await this.gh.createRelease(candidate.name, candidate.tag, candidate.sha, candidate.notes, this.draft);
            return [candidate, release];
        }
        else {
            logger_1.logger.error('Unable to build candidate');
            return [undefined, undefined];
        }
    }
    async run() {
        const [candidate, release] = await this.createRelease();
        if (!(candidate && release)) {
            return;
        }
        // Comment on the release PR with the
        await this.gh.commentOnIssue(`:robot: Release is at ${release.html_url} :sunflower:`, candidate.pullNumber);
        // Add a label indicating that a release has been created on GitHub,
        // but a publication has not yet occurred.
        await this.gh.addLabels([this.releaseLabel], candidate.pullNumber);
        // Remove 'autorelease: pending' which indicates a GitHub release
        // has not yet been created.
        await this.gh.removeLabels(this.releasePR.labels, candidate.pullNumber);
        return this.releaseResponse({
            release,
            version: candidate.version,
            sha: candidate.sha,
            number: candidate.pullNumber,
        });
    }
    releaseResponse(params) {
        logger_1.logger.info(`Created release: ${params.release.html_url}.`);
        const parsedVersion = semver_1.parse(params.version, { loose: true });
        if (parsedVersion) {
            return {
                major: parsedVersion.major,
                minor: parsedVersion.minor,
                patch: parsedVersion.patch,
                sha: params.sha,
                version: params.version,
                pr: params.number,
                html_url: params.release.html_url,
                name: params.release.name,
                tag_name: params.release.tag_name,
                upload_url: params.release.upload_url,
                draft: params.release.draft,
                body: params.release.body,
            };
        }
        else {
            logger_1.logger.warn(`failed to parse version information from ${params.version}`);
            return undefined;
        }
    }
}
exports.GitHubRelease = GitHubRelease;
//# sourceMappingURL=github-release.js.map