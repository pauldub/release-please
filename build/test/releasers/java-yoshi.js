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
const mocha_1 = require("mocha");
const nock = require("nock");
nock.disableNetConnect();
const java_yoshi_1 = require("../../src/releasers/java-yoshi");
const suggester = require("code-suggester");
const sinon = require("sinon");
const github_1 = require("../../src/github");
const chai_1 = require("chai");
const utils_1 = require("./utils");
const helpers_1 = require("../helpers");
const fs_1 = require("fs");
const path_1 = require("path");
const errors_1 = require("../../src/errors");
const assert = require("assert");
const sandbox = sinon.createSandbox();
function buildFileContent(fixture) {
    return utils_1.buildGitHubFileContent('./test/releasers/fixtures/java-yoshi', fixture);
}
mocha_1.describe('JavaYoshi', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.it('creates a release PR', async function () {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
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
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', 'master', undefined)
            .resolves(['pom.xml']);
        findFilesStub.withArgs('build.gradle', 'master', undefined).resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', 'master', undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('versions.txt'));
        getFileContentsStub
            .withArgs('README.md', 'master')
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', 'master')
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', 'master')
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('fix: Fix declared dependencies from merge issue (#291)'),
        ]);
        const addLabelStub = sandbox
            .stub(releasePR.gh, 'addLabels')
            .withArgs(['autorelease: pending'], 22)
            .resolves();
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
        chai_1.expect(addLabelStub.callCount).to.eql(1);
    });
    mocha_1.it('creates a snapshot PR', async function () {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
            snapshot: true,
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', 'master', undefined)
            .resolves(['pom.xml']);
        findFilesStub.withArgs('build.gradle', 'master', undefined).resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', 'master', undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('released-versions.txt'));
        getFileContentsStub
            .withArgs('README.md', 'master')
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', 'master')
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', 'master')
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
        ]);
        // TODO: maybe assert which labels added
        sandbox.stub(releasePR.gh, 'addLabels');
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
    });
    mocha_1.it('creates a snapshot PR, when latest release sha is head', async function () {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
            snapshot: true,
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', 'master', undefined)
            .resolves(['pom.xml']);
        findFilesStub.withArgs('build.gradle', 'master', undefined).resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', 'master', undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('released-versions.txt'));
        getFileContentsStub
            .withArgs('README.md', 'master')
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', 'master')
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', 'master')
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox.stub(releasePR.gh, 'commitsSinceSha').resolves([]);
        // TODO: maybe assert which labels added
        sandbox.stub(releasePR.gh, 'addLabels');
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
    });
    mocha_1.it('ignores a snapshot release if no snapshot needed', async () => {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
            snapshot: true,
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('versions.txt'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        // should not attempt to create a pull request
        sandbox
            .stub(suggester, 'createPullRequest')
            .rejects(Error('should not get here'));
        await releasePR.run();
    });
    mocha_1.it('creates a snapshot PR if an explicit release is requested, but a snapshot is needed', async function () {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
            snapshot: false,
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', 'master', undefined)
            .resolves(['pom.xml']);
        findFilesStub.withArgs('build.gradle', 'master', undefined).resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', 'master', undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('released-versions.txt'));
        getFileContentsStub
            .withArgs('README.md', 'master')
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', 'master')
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', 'master')
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
        ]);
        // TODO: maybe assert which labels added
        sandbox.stub(releasePR.gh, 'addLabels');
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
    });
    mocha_1.it('handles promotion to 1.0.0', async function () {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', 'master', undefined)
            .resolves(['pom.xml']);
        findFilesStub.withArgs('build.gradle', 'master', undefined).resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', 'master', undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('pre-ga-versions.txt'));
        getFileContentsStub
            .withArgs('README.md', 'master')
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', 'master')
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', 'master')
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('feat: promote to 1.0.0 (#292)\n\nRelease-As: 1.0.0'),
        ]);
        // TODO: maybe assert which labels added
        sandbox.stub(releasePR.gh, 'addLabels');
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
    });
    mocha_1.it('creates a release PR against a feature branch', async function () {
        const defaultBranch = '1.x';
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({
                defaultBranch,
                owner: 'googleapis',
                repo: 'java-trace',
            }),
            packageName: 'java-trace',
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', defaultBranch, undefined)
            .resolves(['pom.xml']);
        findFilesStub
            .withArgs('build.gradle', defaultBranch, undefined)
            .resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', defaultBranch, undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', defaultBranch)
            .resolves(buildFileContent('versions.txt'));
        getFileContentsStub
            .withArgs('README.md', defaultBranch)
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', defaultBranch)
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', defaultBranch)
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('fix: Fix declared dependencies from merge issue (#291)'),
        ]);
        // TODO: maybe assert which labels added
        sandbox.stub(releasePR.gh, 'addLabels');
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
    });
    mocha_1.it('handles extra custom files', async function () {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
            extraFiles: ['src/com/google/foo/Version.java'],
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
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
            sha: 'abc123',
            version: '0.20.3',
        }));
        const findFilesStub = sandbox.stub(releasePR.gh, 'findFilesByFilenameAndRef');
        findFilesStub
            .withArgs('pom.xml', 'master', undefined)
            .resolves(['pom.xml']);
        findFilesStub.withArgs('build.gradle', 'master', undefined).resolves([]);
        findFilesStub
            .withArgs('dependencies.properties', 'master', undefined)
            .resolves([]);
        const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
        getFileContentsStub
            .withArgs('versions.txt', 'master')
            .resolves(buildFileContent('versions.txt'));
        getFileContentsStub
            .withArgs('README.md', 'master')
            .resolves(buildFileContent('README.md'));
        getFileContentsStub
            .withArgs('pom.xml', 'master')
            .resolves(buildFileContent('pom.xml'));
        getFileContentsStub
            .withArgs('google-api-client/src/main/java/com/google/api/client/googleapis/GoogleUtils.java', 'master')
            .resolves(buildFileContent('GoogleUtils.java'));
        getFileContentsStub
            .withArgs('src/com/google/foo/Version.java', 'master')
            .resolves(buildFileContent('Version.java'));
        getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('fix: Fix declared dependencies from merge issue (#291)'),
        ]);
        const addLabelStub = sandbox
            .stub(releasePR.gh, 'addLabels')
            .withArgs(['autorelease: pending'], 22)
            .resolves();
        helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
        await releasePR.run();
        chai_1.expect(addLabelStub.callCount).to.eql(1);
    });
    mocha_1.it('rejects with ConfigurationError if missing versions.txt', async () => {
        const releasePR = new java_yoshi_1.JavaYoshi({
            github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            packageName: 'java-trace',
        });
        sandbox
            .stub(releasePR.gh, 'getRepositoryDefaultBranch')
            .returns(Promise.resolve('master'));
        sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
            name: 'v0.20.3',
            sha: 'abc123',
            version: '0.20.3',
        }));
        sandbox
            .stub(releasePR.gh, 'commitsSinceSha')
            .resolves([
            helpers_1.buildMockCommit('fix: Fix declared dependencies from merge issue (#291)'),
        ]);
        // No open release PRs, so create a new release PR
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        // Indicates that there are no PRs currently waiting to be released:
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        nock('https://api.github.com/')
            .get('/repos/googleapis/java-trace/contents/versions.txt?ref=refs%2Fheads%2Fmaster')
            .reply(404);
        await assert.rejects(async () => {
            return releasePR.run();
        }, err => {
            return (err instanceof errors_1.ConfigurationError &&
                err instanceof errors_1.MissingRequiredFileError);
        });
    });
    mocha_1.describe('latestTag', () => {
        let req;
        let releasePR;
        mocha_1.beforeEach(() => {
            req = nock('https://api.github.com/');
            releasePR = new java_yoshi_1.JavaYoshi({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-trace' }),
            });
            sandbox.stub(releasePR.gh, 'getRepositoryDefaultBranch').resolves('main');
        });
        mocha_1.it('returns a stable branch pull request', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve('./test/fixtures', 'latest-tag-stable-branch.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.127.0');
            req.done();
        });
        mocha_1.it('returns a prerelease tag stable branch', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve('./test/fixtures', 'latest-tag-stable-branch.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag(undefined, true);
            chai_1.expect(latestTag.version).to.equal('1.127.1-SNAPSHOT');
            req.done();
        });
        mocha_1.it('returns a renamed PR title', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve('./test/fixtures', 'latest-tag-renamed.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.2.1');
            req.done();
        });
        mocha_1.it('finds a non-ga version', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve('./test/fixtures', 'latest-tag.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('2.0.0-rc1');
            req.done();
        });
    });
});
//# sourceMappingURL=java-yoshi.js.map