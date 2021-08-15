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
const sinon = require("sinon");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const nock = require("nock");
const crypto = require("crypto");
const assert_1 = require("assert");
nock.disableNetConnect();
const github_release_1 = require("../src/github-release");
const github_1 = require("../src/github");
const src_1 = require("../src");
const go_yoshi_1 = require("../src/releasers/go-yoshi");
const node_1 = require("../src/releasers/node");
const java_lts_1 = require("../src/releasers/java-lts");
const sandbox = sinon.createSandbox();
function buildFileContent(content) {
    return {
        content: Buffer.from(content, 'utf8').toString('base64'),
        parsedContent: content,
        // fake a consistent sha
        sha: crypto.createHash('md5').update(content).digest('hex'),
    };
}
mocha_1.describe('GitHubRelease', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    function mockGithubCommon(params) {
        const { github, prHead, prTitle, changeLog, version } = params;
        const mock = sandbox.mock(github);
        mock.expects('getRepositoryDefaultBranch').once().resolves('main');
        mock
            .expects('findMergedPullRequests')
            .once()
            .resolves([
            {
                sha: 'abc123',
                number: 1,
                baseRefName: 'main',
                headRefName: prHead,
                labels: ['autorelease: pending'],
                title: prTitle,
                body: 'Some release notes',
            },
        ]);
        mock
            .expects('getFileContentsOnBranch')
            .withExactArgs(changeLog !== null && changeLog !== void 0 ? changeLog : 'CHANGELOG.md', 'main')
            .once()
            .resolves(buildFileContent(`#Changelog\n\n## v${version !== null && version !== void 0 ? version : '1.0.3'}\n\n* entry`));
        return mock;
    }
    function mockGithubLabelsAndComment(mock, mockLabelsAndComment, releaseLabel = 'autorelease: tagged') {
        if (mockLabelsAndComment) {
            mock
                .expects('commentOnIssue')
                .withExactArgs(':robot: Release is at https://release.url :sunflower:', 1)
                .once()
                .resolves();
            mock
                .expects('addLabels')
                .withExactArgs([releaseLabel], 1)
                .once()
                .resolves();
            mock
                .expects('removeLabels')
                .withExactArgs(['autorelease: pending'], 1)
                .once()
                .resolves();
        }
        else {
            mock.expects('commentOnIssue').never();
            mock.expects('addLabels').never();
            mock.expects('removeLabels').never();
        }
    }
    mocha_1.describe('run', () => {
        mocha_1.it('creates and labels release on GitHub', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1.0.3',
                prTitle: 'Release v1.0.3',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .once()
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const releaser = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await releaser.run();
            mock.verify();
            assert_1.strictEqual(created.name, 'foo v1.0.3');
            assert_1.strictEqual(created.tag_name, 'v1.0.3');
            assert_1.strictEqual(created.major, 1);
            assert_1.strictEqual(created.minor, 0);
            assert_1.strictEqual(created.patch, 3);
            assert_1.strictEqual(created.draft, false);
        });
        mocha_1.it('creates and labels release on GitHub with invalid semver', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1A.B.C',
                prTitle: 'Release v1A.B.C',
                version: '1A.B.C',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'v1A.B.C', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo v1A.B.C',
                tag_name: 'v1A.B.C',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const releaser = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await releaser.run();
            chai_1.expect(created).to.be.undefined;
        });
        mocha_1.it('creates a draft release', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1.0.3',
                prTitle: 'Release v1.0.3',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', true)
                .once()
                .resolves({
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: true,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const releaser = new github_release_1.GitHubRelease({ github, releasePR, draft: true });
            const created = await releaser.run();
            assert_1.strictEqual(created.draft, true);
        });
        mocha_1.it('creates releases for submodule in monorepo', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-bigquery-v1.0.3',
                prTitle: 'Release bigquery v1.0.3',
                changeLog: 'bigquery/CHANGES.md',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('bigquery', 'bigquery/v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'bigquery bigquery/v1.0.3',
                tag_name: 'bigquery/v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new go_yoshi_1.GoYoshi({
                github,
                path: 'bigquery',
                packageName: 'bigquery',
                monorepoTags: true,
                changelogPath: 'CHANGES.md',
            });
            const release = new github_release_1.GitHubRelease({
                github,
                releasePR,
            });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.not.be.undefined;
            assert_1.strictEqual(created.name, 'bigquery bigquery/v1.0.3');
            assert_1.strictEqual(created.tag_name, 'bigquery/v1.0.3');
            assert_1.strictEqual(created.major, 1);
            assert_1.strictEqual(created.minor, 0);
            assert_1.strictEqual(created.patch, 3);
        });
        mocha_1.it('supports submodules in nested folders', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-foo-v1.0.3',
                prTitle: 'Release foo v1.0.3',
                changeLog: 'src/apis/foo/CHANGES.md',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'foo/v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo foo/v1.0.3',
                tag_name: 'foo/v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new go_yoshi_1.GoYoshi({
                github,
                path: 'src/apis/foo',
                packageName: 'foo',
                monorepoTags: true,
                changelogPath: 'CHANGES.md',
            });
            const release = new github_release_1.GitHubRelease({
                github,
                releasePR,
            });
            const created = await release.run();
            mock.verify();
            assert_1.strictEqual(created.name, 'foo foo/v1.0.3');
            assert_1.strictEqual(created.tag_name, 'foo/v1.0.3');
        });
        mocha_1.it('attempts to guess package name for submodule release', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-foo-v1.0.3',
                prTitle: 'Release foo v1.0.3',
                changeLog: 'src/apis/foo/CHANGELOG.md',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('getFileContentsOnBranch')
                .withExactArgs('src/apis/foo/package.json', 'main')
                .once()
                .resolves(buildFileContent('{"name": "@google-cloud/foo"}'));
            mock
                .expects('createRelease')
                .withExactArgs('@google-cloud/foo', 'foo-v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: '@google-cloud/foo foo-v1.0.3',
                tag_name: 'foo-v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new node_1.Node({
                github,
                path: 'src/apis/foo',
                monorepoTags: true,
            });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.not.be.undefined;
            assert_1.strictEqual(created.name, '@google-cloud/foo foo-v1.0.3');
            assert_1.strictEqual(created.tag_name, 'foo-v1.0.3');
        });
        mocha_1.it('attempts to guess package name for release', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1.0.3',
                prTitle: 'Release v1.0.3',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('getFileContentsOnBranch')
                .withExactArgs('package.json', 'main')
                .once()
                .resolves(buildFileContent('{"name": "@google-cloud/foo"}'));
            mock
                .expects('createRelease')
                .withExactArgs('@google-cloud/foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: '@google-cloud/foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new node_1.Node({ github });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            assert_1.strictEqual(created.name, '@google-cloud/foo v1.0.3');
            assert_1.strictEqual(created.tag_name, 'v1.0.3');
        });
        mocha_1.it('empty packageName ok (non-monorepo)', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1.0.3',
                prTitle: 'Release v1.0.3',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .once()
                .withExactArgs('', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.ReleasePR({ github });
            const releaser = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await releaser.run();
            mock.verify();
            assert_1.strictEqual(created.name, 'v1.0.3');
            assert_1.strictEqual(created.tag_name, 'v1.0.3');
        });
        mocha_1.it('empty packageName not ok (monorepo)', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const releasePR = new src_1.ReleasePR({ github, monorepoTags: true });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            let failed = true;
            try {
                await release.run();
                failed = false;
            }
            catch (error) {
                chai_1.expect(error.message).to.equal('package-name required for monorepo releases');
            }
            chai_1.expect(failed).to.be.true;
        });
        mocha_1.it('parses version from PR title (detectReleaseVersionFromTitle impl: base)', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-please/branches/main',
                prTitle: 'chore: release 1.0.3',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.not.be.undefined;
            assert_1.strictEqual(created.name, 'foo v1.0.3');
            assert_1.strictEqual(created.tag_name, 'v1.0.3');
            assert_1.strictEqual(created.major, 1);
            assert_1.strictEqual(created.minor, 0);
            assert_1.strictEqual(created.patch, 3);
            assert_1.strictEqual(created.draft, false);
        });
        mocha_1.it('parses version from PR title (detectReleaseVersionFromTitle impl: java-yoshi)', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-please/branches/main',
                prTitle: 'chore(main): release 1.0.3',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.JavaYoshi({ github, packageName: 'foo' });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.not.be.undefined;
            assert_1.strictEqual(created.name, 'foo v1.0.3');
            assert_1.strictEqual(created.tag_name, 'v1.0.3');
            assert_1.strictEqual(created.major, 1);
            assert_1.strictEqual(created.minor, 0);
            assert_1.strictEqual(created.patch, 3);
            assert_1.strictEqual(created.draft, false);
        });
        mocha_1.it('parses version from PR title (detectReleaseVersionFromTitle impl: java-lts)', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-please/branches/main',
                prTitle: 'chore: release 1.0.3-lts.1',
                version: '1.0.3-lts.1',
            });
            mockGithubLabelsAndComment(mock, true);
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'v1.0.3-lts.1', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo v1.0.3-lts.1',
                tag_name: 'v1.0.3-lts.1',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new java_lts_1.JavaLTS({ github, packageName: 'foo' });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.not.be.undefined;
            assert_1.strictEqual(created.name, 'foo v1.0.3-lts.1');
            assert_1.strictEqual(created.tag_name, 'v1.0.3-lts.1');
            assert_1.strictEqual(created.major, 1);
            assert_1.strictEqual(created.minor, 0);
            assert_1.strictEqual(created.patch, 3);
            assert_1.strictEqual(created.draft, false);
        });
        mocha_1.it('does nothing when no merged release PRs found', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = sandbox.mock(github);
            mock.expects('getRepositoryDefaultBranch').once().resolves('main');
            mock.expects('findMergedPullRequests').once().resolves([]);
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.be.undefined;
        });
        mocha_1.it('does nothing when we find a release PR, but cannot determine the version', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = sandbox.mock(github);
            mock.expects('getRepositoryDefaultBranch').once().resolves('main');
            mock
                .expects('findMergedPullRequests')
                .once()
                .resolves([
                {
                    sha: 'abc123',
                    number: 1,
                    baseRefName: 'main',
                    headRefName: 'release-please/branches/main',
                    labels: ['autorelease: pending'],
                    title: 'Not a match!',
                    body: 'Some release notes',
                },
            ]);
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.be.undefined;
        });
        mocha_1.it('ignores tagged pull requests', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = sandbox.mock(github);
            mock.expects('getRepositoryDefaultBranch').once().resolves('main');
            mock
                .expects('findMergedPullRequests')
                .once()
                .resolves([
                {
                    sha: 'abc123',
                    number: 1,
                    baseRefName: 'main',
                    headRefName: 'release-foo-v1.0.3',
                    labels: ['autorelease: tagged'],
                    title: 'Release foo v1.0.3',
                    body: 'Some release notes',
                },
            ]);
            mock.expects('findMergedPullRequests').once().resolves([]);
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const release = new github_release_1.GitHubRelease({ github, releasePR });
            const created = await release.run();
            mock.verify();
            chai_1.expect(created).to.be.undefined;
        });
        mocha_1.it('supports overriding the release tag', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1.0.3',
                prTitle: 'Release v1.0.3',
            });
            mockGithubLabelsAndComment(mock, true, 'custom-label');
            mock
                .expects('createRelease')
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves({
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            });
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const releaser = new github_release_1.GitHubRelease({
                github,
                releasePR,
                releaseLabel: 'custom-label',
            });
            const created = await releaser.run();
            assert_1.ok(created);
        });
    });
    mocha_1.describe('createRelease', () => {
        mocha_1.it('uses version for createRelease', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const expectedCreateReleaseResponse = {
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            };
            const mock = sandbox.mock(github);
            mock.expects('getRepositoryDefaultBranch').once().resolves('main');
            mock
                .expects('getFileContentsOnBranch')
                .withExactArgs('CHANGELOG.md', 'main')
                .once()
                .resolves(buildFileContent('#Changelog\n\n## v1.0.3\n\n* entry'));
            mock
                .expects('createRelease')
                .once()
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves(expectedCreateReleaseResponse);
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const releaser = new github_release_1.GitHubRelease({ github, releasePR });
            const release = await releaser.createRelease('1.0.3', {
                sha: 'abc123',
                number: 1,
                baseRefName: 'main',
                headRefName: 'release-please/branches/main',
                labels: [],
                title: 'chore: release',
                body: 'the body',
            });
            mock.verify();
            chai_1.expect(release).to.not.be.undefined;
            chai_1.expect(release).to.eql(expectedCreateReleaseResponse);
        });
        mocha_1.it('finds version for createRelease', async () => {
            const github = new github_1.GitHub({ owner: 'googleapis', repo: 'foo' });
            const expectedCreateReleaseResponse = {
                name: 'foo v1.0.3',
                tag_name: 'v1.0.3',
                draft: false,
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                body: '\n* entry',
            };
            const mock = mockGithubCommon({
                github,
                prHead: 'release-v1.0.3',
                prTitle: 'Release v1.0.3',
            });
            mockGithubLabelsAndComment(mock, false);
            mock
                .expects('createRelease')
                .once()
                .withExactArgs('foo', 'v1.0.3', 'abc123', '\n* entry', false)
                .once()
                .resolves(expectedCreateReleaseResponse);
            const releasePR = new src_1.ReleasePR({ github, packageName: 'foo' });
            const releaser = new github_release_1.GitHubRelease({ github, releasePR });
            const [candidate, release] = await releaser.createRelease();
            mock.verify();
            chai_1.expect(candidate).to.not.be.undefined;
            chai_1.expect(candidate).to.eql({
                sha: 'abc123',
                tag: 'v1.0.3',
                notes: '\n* entry',
                name: 'foo',
                version: '1.0.3',
                pullNumber: 1,
            });
            chai_1.expect(release).to.not.be.undefined;
            chai_1.expect(release).to.eql(expectedCreateReleaseResponse);
        });
    });
});
//# sourceMappingURL=github-release.js.map