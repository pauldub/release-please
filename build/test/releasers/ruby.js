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
const assert = require("assert");
const mocha_1 = require("mocha");
const github_1 = require("../../src/github");
const sinon = require("sinon");
const utils_1 = require("./utils");
const helpers_1 = require("../helpers");
const src_1 = require("../../src");
const sandbox = sinon.createSandbox();
function stubFilesToUpdate(github, files) {
    utils_1.stubFilesFromFixtures({
        fixturePath: './test/updaters/fixtures',
        sandbox,
        github,
        files,
    });
}
const LATEST_TAG = {
    name: 'v0.5.0',
    sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
    version: '0.5.0',
};
const COMMITS = [
    helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
    helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
    helpers_1.buildMockCommit('chore: update common templates'),
];
function stubGithub(releasePR, commits = COMMITS, latestTag = LATEST_TAG) {
    sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('master');
    // No open release PRs, so create a new release PR
    sandbox.stub(releasePR.gh, 'findOpenReleasePRs').returns(Promise.resolve([]));
    sandbox
        .stub(releasePR.gh, 'findMergedReleasePR')
        .returns(Promise.resolve(undefined));
    sandbox.stub(releasePR, 'latestTag').resolves(latestTag);
    sandbox.stub(releasePR.gh, 'commitsSinceSha').resolves(commits);
    sandbox.stub(releasePR.gh, 'addLabels');
}
mocha_1.describe('Ruby', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    const pkgName = 'google-cloud-automl';
    mocha_1.describe('run', () => {
        mocha_1.it('creates a release PR with defaults', async function () {
            const releasePR = new src_1.Ruby({
                versionFile: 'version.rb',
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'ruby-test-repo' }),
                packageName: pkgName,
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR);
            stubFilesToUpdate(releasePR.gh, ['version.rb']);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
        mocha_1.it('creates a release PR relative to a path', async function () {
            const releasePR = new src_1.Ruby({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'ruby-test-repo' }),
                packageName: pkgName,
                path: 'projects/ruby',
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR);
            stubFilesToUpdate(releasePR.gh, ['version.rb']);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
        mocha_1.it('creates a release PR with custom config', async function () {
            const releasePR = new src_1.Ruby({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'ruby-test-repo' }),
                packageName: pkgName,
                path: 'projects/ruby',
                bumpMinorPreMajor: true,
                monorepoTags: true,
                changelogPath: 'HISTORY.md',
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const commits = [helpers_1.buildMockCommit('feat!: still no major version')];
            commits.push(...COMMITS);
            const latestTag = { ...LATEST_TAG };
            latestTag.name = pkgName + '/v' + latestTag.version;
            stubGithub(releasePR, commits, latestTag);
            stubFilesToUpdate(releasePR.gh, ['projects/ruby/version.rb']);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
    });
});
//# sourceMappingURL=ruby.js.map