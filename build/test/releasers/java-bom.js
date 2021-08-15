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
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const java_bom_1 = require("../../src/releasers/java-bom");
const suggester = require("code-suggester");
const sinon = require("sinon");
const github_1 = require("../../src/github");
const utils_1 = require("./utils");
const helpers_1 = require("../helpers");
const sandbox = sinon.createSandbox();
function buildFileContent(fixture) {
    return utils_1.buildGitHubFileContent('./test/releasers/fixtures/java-bom', fixture);
}
mocha_1.describe('JavaBom', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('run', () => {
        mocha_1.it('creates a release PR', async function () {
            const releasePR = new java_bom_1.JavaBom({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-cloud-bom' }),
                packageName: 'java-cloud-bom',
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
                name: 'v0.123.4',
                sha: 'abc123',
                version: '0.123.4',
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
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .resolves([
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
                helpers_1.buildMockCommit('chore: update common templates'),
            ]);
            // TODO: maybe assert which labels added
            sandbox.stub(releasePR.gh, 'addLabels');
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
        });
        mocha_1.it('creates a snapshot PR', async function () {
            const releasePR = new java_bom_1.JavaBom({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-cloud-bom' }),
                packageName: 'java-cloud-bom',
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
                name: 'v0.123.4',
                sha: 'abc123',
                version: '0.123.4',
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
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .resolves([
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
                helpers_1.buildMockCommit('chore: update common templates'),
            ]);
            // TODO: maybe assert which labels added
            sandbox.stub(releasePR.gh, 'addLabels');
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
        });
        mocha_1.it('ignores a snapshot release if no snapshot needed', async () => {
            const releasePR = new java_bom_1.JavaBom({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-cloud-bom' }),
                packageName: 'java-cloud-bom',
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
            const releasePR = new java_bom_1.JavaBom({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-cloud-bom' }),
                packageName: 'java-cloud-bom',
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
                name: 'v0.123.4',
                sha: 'abc123',
                version: '0.123.4',
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
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .resolves([
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
                helpers_1.buildMockCommit('chore: update common templates'),
            ]);
            // TODO: maybe assert which labels added
            sandbox.stub(releasePR.gh, 'addLabels');
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
        });
        mocha_1.it('merges conventional commit messages', async function () {
            const releasePR = new java_bom_1.JavaBom({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'java-cloud-bom' }),
                packageName: 'java-cloud-bom',
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
                name: 'v0.123.4',
                sha: 'abc123',
                version: '0.123.4',
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
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            sandbox
                .stub(releasePR.gh, 'commitsSinceSha')
                .resolves([
                helpers_1.buildMockCommit('deps: update dependency com.google.cloud:google-cloud-storage to v1.120.1'),
                helpers_1.buildMockCommit('feat: import google-cloud-game-servers'),
                helpers_1.buildMockCommit('chore: update common templates'),
            ]);
            // TODO: maybe assert which labels added
            sandbox.stub(releasePR.gh, 'addLabels');
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
        });
    });
    mocha_1.describe('dependencyUpdates', () => {
        mocha_1.it('ignores non-conforming commits', async () => {
            const commits = [{ sha: 'abcd', message: 'some message', files: [] }];
            const versionMap = java_bom_1.JavaBom.dependencyUpdates(commits);
            chai_1.expect(versionMap.size).to.equal(0);
        });
        mocha_1.it('parses a conforming commit', async () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
            ];
            const versionMap = java_bom_1.JavaBom.dependencyUpdates(commits);
            chai_1.expect(versionMap.size).to.equal(1);
            chai_1.expect(versionMap.has('com.example.foo:my-artifact')).to.equal(true);
            chai_1.expect(versionMap.get('com.example.foo:my-artifact')).to.equal('v1.2.3');
        });
        mocha_1.it('parses multiple conforming commits', async () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:another-artifact to v2.3.4',
                    files: [],
                },
            ];
            const versionMap = java_bom_1.JavaBom.dependencyUpdates(commits);
            chai_1.expect(versionMap.size).to.equal(2);
            chai_1.expect(versionMap.has('com.example.foo:my-artifact')).to.equal(true);
            chai_1.expect(versionMap.get('com.example.foo:my-artifact')).to.equal('v1.2.3');
            chai_1.expect(versionMap.has('com.example.foo:another-artifact')).to.equal(true);
            chai_1.expect(versionMap.get('com.example.foo:another-artifact')).to.equal('v2.3.4');
        });
        mocha_1.it('handles multiple updates of the same dependency', async () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.4',
                    files: [],
                },
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
            ];
            const versionMap = java_bom_1.JavaBom.dependencyUpdates(commits);
            chai_1.expect(versionMap.size).to.equal(1);
            chai_1.expect(versionMap.has('com.example.foo:my-artifact')).to.equal(true);
            chai_1.expect(versionMap.get('com.example.foo:my-artifact')).to.equal('v1.2.4');
        });
        mocha_1.it('prefers the latest updates of the same dependency', async () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.4',
                    files: [],
                },
            ];
            const versionMap = java_bom_1.JavaBom.dependencyUpdates(commits);
            chai_1.expect(versionMap.size).to.equal(1);
            chai_1.expect(versionMap.has('com.example.foo:my-artifact')).to.equal(true);
            chai_1.expect(versionMap.get('com.example.foo:my-artifact')).to.equal('v1.2.3');
        });
    });
    mocha_1.describe('isNonPatchVersion', () => {
        mocha_1.it('should parse a major version bump', async () => {
            const commit = {
                sha: 'abcd',
                message: 'deps: update dependency com.example.foo:my-artifact to v2',
                files: [],
            };
            chai_1.expect(java_bom_1.JavaBom.isNonPatchVersion(commit)).to.equal(true);
        });
        mocha_1.it('should parse a minor version bump', async () => {
            const commit = {
                sha: 'abcd',
                message: 'deps: update dependency com.example.foo:my-artifact to v1.2.0',
                files: [],
            };
            chai_1.expect(java_bom_1.JavaBom.isNonPatchVersion(commit)).to.equal(true);
        });
        mocha_1.it('should parse a minor version bump', async () => {
            const commit = {
                sha: 'abcd',
                message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                files: [],
            };
            chai_1.expect(java_bom_1.JavaBom.isNonPatchVersion(commit)).to.equal(false);
        });
        mocha_1.it('should ignore a non conforming commit', async () => {
            const commit = {
                sha: 'abcd',
                message: 'some message',
                files: [],
            };
            chai_1.expect(java_bom_1.JavaBom.isNonPatchVersion(commit)).to.equal(false);
        });
    });
    mocha_1.describe('determineBumpType', () => {
        mocha_1.it('should return patch for patch-only bumps', () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:another-artifact to v2.3.4',
                    files: [],
                },
            ];
            chai_1.expect(java_bom_1.JavaBom.determineBumpType(commits)).to.equal('patch');
        });
        mocha_1.it('should return minor for bumps that include a minor', () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:another-artifact to v2.3.0',
                    files: [],
                },
            ];
            chai_1.expect(java_bom_1.JavaBom.determineBumpType(commits)).to.equal('minor');
        });
        mocha_1.it('should return minor for bumps that include a major', () => {
            const commits = [
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:my-artifact to v1.2.3',
                    files: [],
                },
                {
                    sha: 'abcd',
                    message: 'deps: update dependency com.example.foo:another-artifact to v2',
                    files: [],
                },
            ];
            chai_1.expect(java_bom_1.JavaBom.determineBumpType(commits)).to.equal('minor');
        });
    });
});
//# sourceMappingURL=java-bom.js.map