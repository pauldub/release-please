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
const ruby_yoshi_1 = require("../../src/releasers/ruby-yoshi");
const sandbox = sinon.createSandbox();
function stubFilesToUpdate(github, files) {
    utils_1.stubFilesFromFixtures({
        fixturePath: './test/updaters/fixtures',
        sandbox,
        github,
        files,
    });
}
const TAG_SHA = 'da6e52d956c1e35d19e75e0f2fdba439739ba364';
const COMMITS = [
    helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
    helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
    helpers_1.buildMockCommit('chore: update common templates'),
];
function stubGithub(releasePR, expectedVersion) {
    sandbox
        .stub(releasePR.gh, 'findMergedReleasePR')
        .returns(Promise.resolve(undefined));
    sandbox.stub(releasePR.gh, 'findOpenReleasePRs').returns(Promise.resolve([]));
    sandbox.stub(releasePR.gh, 'openPR').callsFake(arg => {
        if (arg.updates[0].version === expectedVersion) {
            return Promise.resolve(22);
        }
        else {
            return Promise.resolve(21);
        }
    });
    sandbox.stub(releasePR.gh, 'addLabels');
    sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('master');
}
mocha_1.describe('RubyYoshi', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    const pkgName = 'google-cloud-automl';
    mocha_1.describe('run', () => {
        mocha_1.it('creates a release PR with a previous release', async function () {
            const releasePR = new ruby_yoshi_1.RubyYoshi({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'ruby-test-repo' }),
                versionFile: 'version.rb',
                bumpMinorPreMajor: true,
                monorepoTags: true,
                packageName: pkgName,
                lastPackageVersion: '0.5.0',
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR, '0.5.1');
            sandbox.stub(releasePR.gh, 'getTagSha').resolves(TAG_SHA);
            sandbox.stub(releasePR.gh, 'commitsSinceSha').resolves(COMMITS);
            stubFilesToUpdate(releasePR.gh, ['version.rb']);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
        mocha_1.it('creates a release PR with no previous release', async function () {
            const releasePR = new ruby_yoshi_1.RubyYoshi({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'ruby-test-repo' }),
                versionFile: 'version.rb',
                bumpMinorPreMajor: true,
                monorepoTags: true,
                packageName: pkgName,
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR, '0.1.0');
            sandbox.stub(releasePR.gh, 'commitsSinceSha').resolves(COMMITS);
            stubFilesToUpdate(releasePR.gh, ['version.rb']);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
    });
});
//# sourceMappingURL=ruby-yoshi.js.map