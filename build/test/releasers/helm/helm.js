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
const mocha_1 = require("mocha");
const fs_1 = require("fs");
const path_1 = require("path");
const helpers_1 = require("../../helpers");
const nock = require("nock");
const helm_1 = require("../../../src/releasers/helm");
const sinon = require("sinon");
const github_1 = require("../../../src/github");
nock.disableNetConnect();
const sandbox = sinon.createSandbox();
const fixturesPath = './test/releasers/fixtures/helm';
mocha_1.describe('Helm', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('run', () => {
        mocha_1.it('creates a release PR', async function () {
            const releasePR = new helm_1.Helm({
                github: new github_1.GitHub({ owner: 'abhinav-demo', repo: 'helm-test-repo' }),
                packageName: 'helm-test-repo',
            });
            // Indicates that there are no PRs currently waiting to be released:
            sandbox
                .stub(releasePR.gh, 'findMergedReleasePR')
                .returns(Promise.resolve(undefined));
            // Return latest tag used to determine next version #:
            sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                name: 'v0.123.4',
                version: '0.123.4',
            }));
            // Commits, used to build CHANGELOG, and propose next version bump:
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .returns(Promise.resolve(helpers_1.readPOJO('commits-fix')));
            // See if there are any release PRs already open, we do this as
            // we consider opening a new release-pr:
            sandbox
                .stub(releasePR.gh, 'findOpenReleasePRs')
                .returns(Promise.resolve([]));
            // Lookup the default branch name:
            sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
            // Fetch files from GitHub, in prep to update with code-suggester:
            const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
            const manifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Chart.yaml'), 'utf8');
            getFileContentsStub.withArgs('Chart.yaml', 'main').resolves({
                sha: 'abc123',
                content: Buffer.from(manifestContent, 'utf8').toString('base64'),
                parsedContent: manifestContent,
            });
            // CHANGELOG is not found, and will be created:
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            // Call to add autorelease: pending label:
            sandbox.stub(releasePR.gh, 'addLabels');
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
        });
    });
});
//# sourceMappingURL=helm.js.map