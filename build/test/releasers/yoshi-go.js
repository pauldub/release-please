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
const assert = require("assert");
const mocha_1 = require("mocha");
const nock = require("nock");
const go_yoshi_1 = require("../../src/releasers/go-yoshi");
const helpers_1 = require("../helpers");
const sinon = require("sinon");
const chai_1 = require("chai");
const helpers_2 = require("../helpers");
const github_1 = require("../../src/github");
const sandbox = sinon.createSandbox();
mocha_1.describe('YoshiGo', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('run', () => {
        mocha_1.before(() => {
            nock.disableNetConnect();
        });
        mocha_1.it('creates a release PR for google-cloud-go', async function () {
            const releasePR = new go_yoshi_1.GoYoshi({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'google-cloud-go' }),
                packageName: 'yoshi-go',
            });
            sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('master');
            // No open release PRs, so create a new release PR
            sandbox
                .stub(releasePR.gh, 'findOpenReleasePRs')
                .returns(Promise.resolve([]));
            // Indicates that there are no PRs currently waiting to be released:
            sandbox
                .stub(releasePR.gh, 'findMergedReleasePR')
                .returns(Promise.resolve(undefined));
            sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                name: 'v0.123.4',
                sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                version: '0.123.4',
            }));
            const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .resolves([
                helpers_2.buildMockCommit('fix(automl): fixed a really bad bug'),
                helpers_2.buildMockCommit('feat(asset): added a really cool feature'),
                helpers_2.buildMockCommit('fix(pubsub): this commit should be ignored'),
                helpers_2.buildMockCommit('fix(pubsub/pstest): this commit should be ignored'),
                helpers_2.buildMockCommit('fix: this commit should be ignored'),
                helpers_2.buildMockCommit('chore(all): auto-regenerate gapics (#1000)\n\nChanges:\n\nchore(automl): cleaned up a thing\n  PiperOrigin-RevId: 352834281\nfix(pubsublite): a minor issue\n  PiperOrigin-RevId: 352834283'),
                helpers_2.buildMockCommit('chore(all): auto-regenerate gapics (#1001)\n\nCommit Body\n\nChanges:\n\nfix(automl): fixed a minor thing\n  PiperOrigin-RevId: 352834280\nfeat(language): added a new one\n  PiperOrigin-RevId: 352834282'),
                helpers_2.buildMockCommit('fix(pubsublite): start generating v1'),
            ]);
            const addLabelStub = sandbox
                .stub(releasePR.gh, 'addLabels')
                .withArgs(['autorelease: pending'], 22)
                .resolves();
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
            chai_1.expect(addLabelStub.callCount).to.eql(1);
        });
        mocha_1.it('creates a release PR for google-api-go-client', async function () {
            const releasePR = new go_yoshi_1.GoYoshi({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'google-api-go-client' }),
                packageName: 'yoshi-go',
            });
            sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('master');
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
            // See if there are any release PRs already open, we do this as
            // we consider opening a new release-pr:
            sandbox
                .stub(releasePR.gh, 'findOpenReleasePRs')
                .returns(Promise.resolve([]));
            const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .resolves([
                helpers_2.buildMockCommit('fix(automl): fixed a really bad bug'),
                helpers_2.buildMockCommit('feat(asset): added a really cool feature'),
                helpers_2.buildMockCommit('fix(pubsub): this commit should be included'),
                helpers_2.buildMockCommit('fix(pubsub/pstest): this commit should also be included'),
                helpers_2.buildMockCommit('fix: this commit should be included'),
                helpers_2.buildMockCommit('feat(all): auto-regenerate discovery clients (#1000)'),
                helpers_2.buildMockCommit('feat(all): auto-regenerate discovery clients (#1001)\n\nCommit Body'),
            ]);
            // Call to add autorelease: pending label:
            const addLabelStub = sandbox
                .stub(releasePR.gh, 'addLabels')
                .withArgs(['autorelease: pending'], 22)
                .resolves();
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
            chai_1.expect(addLabelStub.callCount).to.eql(1);
        });
    });
    mocha_1.it('supports releasing submodule from google-cloud-go', async function () {
        const releasePR = new go_yoshi_1.GoYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'google-cloud-go' }),
            packageName: 'pubsublite',
            monorepoTags: true,
            path: 'pubsublite',
        });
        sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('master');
        // Indicates that there are no PRs currently waiting to be released:
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Return latest tag used to determine next version #:
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
            name: 'pubsublite/v0.123.4',
            version: '0.123.4',
        }));
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_2.buildMockCommit('fix(automl): fixed a really bad bug'),
            helpers_2.buildMockCommit('feat(asset): added a really cool feature'),
            helpers_2.buildMockCommit('fix(pubsub): this commit should be ignored'),
            helpers_2.buildMockCommit('fix(pubsub/pstest): this commit should be ignored'),
            helpers_2.buildMockCommit('fix: this commit should be ignored'),
            helpers_2.buildMockCommit('chore(all): auto-regenerate gapics (#1000)\n\nChanges:\n\nchore(automl): cleaned up a thing\n  PiperOrigin-RevId: 352834281\nfix(pubsublite): a minor issue\n  PiperOrigin-RevId: 352834283'),
            helpers_2.buildMockCommit('chore(all): auto-regenerate gapics (#1001)\n\nCommit Body\n\nChanges:\n\nfix(automl): fixed a minor thing\n  PiperOrigin-RevId: 352834280\nfeat(language): added a new one\n  PiperOrigin-RevId: 352834282'),
            helpers_2.buildMockCommit('fix(pubsublite): start generating v1'),
        ]);
        // See if there are any release PRs already open, we do this as
        // we consider opening a new release-pr:
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        // Call to add autorelease: pending label:
        const addLabelStub = sandbox
            .stub(releasePR.gh, 'addLabels')
            .withArgs(['autorelease: pending'], 22)
            .resolves();
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        const pr = await releasePR.run();
        assert.strictEqual(pr, 22);
        chai_1.expect(addLabelStub.callCount).to.eql(1);
    });
});
//# sourceMappingURL=yoshi-go.js.map