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
const nock = require("nock");
nock.disableNetConnect();
const php_yoshi_1 = require("../../src/releasers/php-yoshi");
const sinon = require("sinon");
const chai_1 = require("chai");
const utils_1 = require("./utils");
const fs_1 = require("fs");
const path_1 = require("path");
const github_1 = require("../../src/github");
const helpers_1 = require("../helpers");
const sandbox = sinon.createSandbox();
const fixturesPath = './test/fixtures';
mocha_1.describe('PHPYoshi', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.it('generates php-yoshi CHANGELOG and aborts if duplicate', async function () {
        const releasePR = new php_yoshi_1.PHPYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'release-please' }),
            packageName: 'yoshi-php',
        });
        sandbox
            .stub(releasePR.gh, 'getDefaultBranch')
            .returns(Promise.resolve('master'));
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'bf69d0f204474b88b3f8b5a72a392129d16a3929',
            version: '0.20.3',
        }));
        const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'commits-yoshi-php-monorepo.json'), 'utf8'));
        const req = nock('https://api.github.com')
            // now we fetch the commits via the graphql API;
            // note they will be truncated to just before the tag's sha.
            .post('/graphql', () => {
            return true;
        })
            .reply(200, {
            data: graphql,
        });
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('AutoMl/composer.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"name": "automl"}'));
        getFileContentsStub
            .withArgs('AutoMl/VERSION', 'master')
            .resolves(utils_1.buildGitHubFileRaw('1.8.3'));
        getFileContentsStub
            .withArgs('Datastore/composer.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"name": "datastore"}'));
        getFileContentsStub
            .withArgs('Datastore/VERSION', 'master')
            .resolves(utils_1.buildGitHubFileRaw('2.0.0'));
        getFileContentsStub
            .withArgs('PubSub/composer.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"name": "pubsub"}'));
        getFileContentsStub
            .withArgs('PubSub/VERSION', 'master')
            .resolves(utils_1.buildGitHubFileRaw('1.0.1'));
        getFileContentsStub
            .withArgs('Speech/composer.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"name": "speech"}'));
        getFileContentsStub
            .withArgs('Speech/VERSION', 'master')
            .resolves(utils_1.buildGitHubFileRaw('1.0.0'));
        getFileContentsStub
            .withArgs('WebSecurityScanner/composer.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"name": "websecurityscanner"}'));
        getFileContentsStub
            .withArgs('WebSecurityScanner/VERSION', 'master')
            .resolves(utils_1.buildGitHubFileRaw('0.8.0'));
        getFileContentsStub
            .withArgs('composer.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"replace": {}}'));
        getFileContentsStub
            .withArgs('docs/manifest.json', 'master')
            .resolves(utils_1.buildGitHubFileRaw('{"modules": [{"name": "google/cloud", "versions": []}, {"name": "datastore", "versions": []}]}'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        const addLabelStub = sandbox
            .stub(releasePR.gh, 'addLabels')
            .withArgs(['autorelease: pending'], 22)
            .resolves();
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
        req.done();
        chai_1.expect(addLabelStub.callCount).to.eql(1);
    });
});
//# sourceMappingURL=php-yoshi.js.map