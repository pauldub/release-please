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
const manifest_1 = require("../src/manifest");
const sinon = require("sinon");
const github_1 = require("../src/github");
const utils_1 = require("./releasers/utils");
const chai_1 = require("chai");
const checkpoint_1 = require("../src/util/checkpoint");
const helpers_1 = require("./helpers");
const prettyJsonStringify = (value) => JSON.stringify(value, undefined, 2) + '\n';
const fixturePath = './test/fixtures/manifest/repo';
const defaultBranch = 'main';
const lastReleaseSha = 'abc123';
const addLabel = 'autorelease: pending';
const sandbox = sinon.createSandbox();
mocha_1.describe('Manifest', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    function expectManifest(mock, params) {
        const { manifest, lastReleaseSha } = params !== null && params !== void 0 ? params : {};
        if (manifest) {
            mock
                .expects('getFileContentsWithSimpleAPI')
                .once()
                .withExactArgs('.release-please-manifest.json', lastReleaseSha, false)
                .resolves(utils_1.buildGitHubFileRaw(manifest));
        }
        else if (manifest === false) {
            mock
                .expects('getFileContentsWithSimpleAPI')
                .once()
                .withExactArgs('.release-please-manifest.json', lastReleaseSha, false)
                .rejects(Object.assign(Error('not found'), { status: 404 }));
        }
        else {
            mock.expects('getFileContentsWithSimpleAPI').never();
        }
    }
    function expectPR(mock, params) {
        const { mergedPRFiles, mergedPRLabels, lastReleaseSha } = params !== null && params !== void 0 ? params : {};
        let mergedPR;
        if (lastReleaseSha) {
            mergedPR = {
                sha: lastReleaseSha,
                title: '',
                body: '',
                number: 22,
                baseRefName: '',
                headRefName: '',
                files: mergedPRFiles !== null && mergedPRFiles !== void 0 ? mergedPRFiles : [],
                labels: mergedPRLabels !== null && mergedPRLabels !== void 0 ? mergedPRLabels : ['autorelease: pending'],
            };
        }
        mock
            .expects('lastMergedPRByHeadBranch')
            .atMost(1)
            .withExactArgs('release-please/branches/main')
            .resolves(mergedPR);
        // creating a new PR
        mock.expects('findOpenReleasePRs').atMost(1).resolves([]);
    }
    function expectCommitsSinceSha(mock, params) {
        const { commits, lastReleaseSha } = params !== null && params !== void 0 ? params : {};
        if (commits) {
            mock
                .expects('commitsSinceShaRest')
                .once()
                .withExactArgs(lastReleaseSha)
                .resolves(commits);
        }
        else {
            mock.expects('commitsSinceShaRest').never();
        }
    }
    function expectGetFiles(mock, params) {
        const { fixtureFiles, inlineFiles } = params !== null && params !== void 0 ? params : {};
        if (fixtureFiles || inlineFiles) {
            const fixtures = fixtureFiles !== null && fixtureFiles !== void 0 ? fixtureFiles : [];
            const inlines = inlineFiles !== null && inlineFiles !== void 0 ? inlineFiles : [];
            for (const fixture of fixtures) {
                mock
                    .expects('getFileContentsOnBranch')
                    .withExactArgs(fixture, 'main')
                    .once()
                    .resolves(utils_1.buildGitHubFileContent(fixturePath, fixture));
            }
            for (const [file, contents] of inlines) {
                mock
                    .expects('getFileContentsOnBranch')
                    .withExactArgs(file, 'main')
                    .once()
                    .resolves(utils_1.buildGitHubFileRaw(contents));
            }
            const expectedNotFound = [
                'node/pkg1/package-lock.json',
                'node/pkg1/npm-shrinkwrap.json',
                'node/pkg1/samples/package.json',
                'node/pkg1/CHANGELOG.md',
                'node/pkg1/HISTORY.md',
                'node/pkg2/package-lock.json',
                'node/pkg2/npm-shrinkwrap.json',
                'node/pkg2/samples/package.json',
                'node/pkg2/CHANGELOG.md',
                'python/CHANGELOG.md',
                'python/HISTORY.md',
                'package-lock.json',
                'npm-shrinkwrap.json',
                'samples/package.json',
                'CHANGELOG.md',
            ];
            for (const notFound of expectedNotFound) {
                mock
                    .expects('getFileContentsOnBranch')
                    .withExactArgs(notFound, 'main')
                    .atMost(1)
                    .rejects(Object.assign(Error('not found'), { status: 404 }));
            }
        }
        else {
            mock.expects('getFileContentsOnBranch').never();
        }
    }
    function expectLabelAndComment(mock, params) {
        const { addLabel, removeLabel, prComments } = params !== null && params !== void 0 ? params : {};
        const addLabelsExp = mock.expects('addLabels');
        if (addLabel) {
            addLabelsExp.once().withExactArgs([addLabel], 22).resolves(true);
        }
        else {
            addLabelsExp.never();
        }
        const removeLabelsExp = mock.expects('removeLabels');
        if (removeLabel) {
            removeLabelsExp.once().withExactArgs([removeLabel], 22).resolves(true);
        }
        else {
            removeLabelsExp.never();
        }
        if (prComments) {
            for (const comment of prComments) {
                mock
                    .expects('commentOnIssue')
                    .withExactArgs(comment, 22)
                    .once()
                    .resolves();
            }
        }
        else {
            mock.expects('commentOnIssue').never();
        }
    }
    function mockGithub(github) {
        const mock = sandbox.mock(github);
        // implementation strips leading `path` from results
        mock
            .expects('findFilesByFilename')
            .atMost(1)
            .withExactArgs('version.py', 'python')
            .resolves(['src/foolib/version.py']);
        mock
            .expects('getFileContentsOnBranch')
            .atMost(1)
            .withArgs('pyproject.toml', 'main')
            .rejects();
        return mock;
    }
    mocha_1.describe('pullRequest', () => {
        mocha_1.it('creates a PR for python and node packages', async function () {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
                python: '1.2.3',
            });
            const manifestFileAtHEAD = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                // test that we overwrite any existing path versions that someone tried
                // to change.
                python: '9.9.9',
            });
            const config = prettyJsonStringify({
                packages: {
                    'node/pkg1': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifestFileAtHEAD],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('allows root module to be published, via special "." path', async function () {
            const manifest = prettyJsonStringify({
                '.': '2.0.0',
                'node/pkg1': '3.2.1',
                'node/pkg2': '1.2.3',
            });
            const config = prettyJsonStringify({
                packages: {
                    '.': {},
                    'node/pkg1': {},
                    'node/pkg2': {},
                },
            });
            const commits = [
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2)!: major new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
                helpers_1.buildMockCommit('fix(root): root only change', ['src/foo.ts']),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'package.json',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 2.0.0 for . in .release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in .release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for node/pkg2 in .release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(googleapis)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('respects python releaser specific config over defaults', async function () {
            // https://github.com/googleapis/release-please/pull/790#issuecomment-783792069
            if (process.versions.node.split('.')[0] === '10') {
                this.skip();
            }
            const manifest = prettyJsonStringify({
                'node/pkg1': '0.1.1',
                'node/pkg2': '0.2.2',
                python: '0.1.1',
            });
            const config = prettyJsonStringify({
                'bump-minor-pre-major': true,
                'release-as': '5.5.5',
                'changelog-sections': [
                    { type: 'feat', section: 'Default Features Section' },
                    { type: 'fix', section: 'Default Bug Fixes Section' },
                ],
                packages: {
                    // expect to see 5.5.5 from default release-as
                    'node/pkg1': {
                        'changelog-path': 'HISTORY.md',
                    },
                    // expect to see 0.3.0 because commit feat(@node/pkg2)! and default
                    // bump-minor-pre-major is true and release-as is locally turned off
                    'node/pkg2': {
                        'release-as': '',
                    },
                    // expect to see 1.0.1 because commit feat(foolib)! and local
                    // bump-minor-pre-major is false and release-as is locally turned off
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                        'bump-minor-pre-major': false,
                        'release-as': '',
                        'changelog-sections': [
                            { type: 'feat', section: 'Python Features Section' },
                            { type: 'fix', section: 'Python Bug Fixes Section' },
                        ],
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('feat(foolib)!: python feature', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('fix(foolib): python bufix', [
                    'python/src/foolib/bar.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2)!: node2 feature', [
                    'node/pkg2/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: node feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('bugfix(@node/pkg1): node bugfix', [
                    'node/pkg1/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    // manifest has not been changed.
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.2.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.1 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('bootstraps a new package from curated manifest', async function () {
            const manifest = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                python: '1.2.3',
            });
            const manifestFileAtHEAD = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                // New package's "previous" version manually added since last release.
                // Candidate release will increment this version.
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifestFileAtHEAD],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Failed to find version for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Bootstrapping from .release-please-manifest.json at tip of main ' +
                        'for missing paths [node/pkg2]',
                    checkpoint_1.CheckpointType.Failure,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('bootstraps a new package using default version', async function () {
            const manifest = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    // manifest has not been changed.
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Failed to find version for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Bootstrapping from .release-please-manifest.json at tip of main ' +
                        'for missing paths [node/pkg2]',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Failed to find version for node/pkg2 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                [
                    'Falling back to default version for Node(@node/pkg2): 1.0.0',
                    checkpoint_1.CheckpointType.Failure,
                ],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('only includes packages that have version bumps', async function () {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = JSON.stringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg2/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    // manifest has not been changed.
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('does not create a PR if no changes', async function () {
            const manifest = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            // nothing user facing
            const commits = [
                helpers_1.buildMockCommit('chore(foolib): python foolib docs', [
                    'python/src/foolib/README.md',
                ]),
                helpers_1.buildMockCommit('refactor(@node/pkg1): internal refactor', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('ci(@node/pkg2): build tweaks', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg1/package.json', 'node/pkg2/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    // manifest has not been changed.
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectLabelAndComment(mock);
            // there should be no snapshot created for this test
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.be.undefined;
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
                ['No user facing changes to release', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('boostraps from HEAD manifest if first PR', async function () {
            // no previously merged PR found, will use this as bootstrap
            const manifestFileAtHEAD = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock);
            expectPR(mock);
            // lastReleaseSha is undefined and no bootstrap-sha so we expect
            // gh.commitsSinceShaRest to be called with `undefined` meaning go all
            // the way back to the first commit.
            expectCommitsSinceSha(mock, { commits });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifestFileAtHEAD],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "undefined" using "no last release sha found"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Bootstrapping from .release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('uses last-release-sha', async function () {
            const manifest = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                'last-release-sha': lastReleaseSha,
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha: 'skip-this-bad-release-PR' });
            expectCommitsSinceSha(mock, {
                lastReleaseSha,
                commits,
            });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-sha"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('boostraps from HEAD manifest starting at bootstrap-sha if first PR', async function () {
            // no previously merged PR found, will use this as bootstrap
            const manifestFileAtHEAD = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                'bootstrap-sha': 'some-sha-in-mains-history',
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, {
                manifest: false,
                lastReleaseSha: 'some-sha-in-mains-history',
            });
            expectPR(mock);
            // not actually testing gh.CommitsSinceSha, sufficient to know that
            // Manifest called it with the 'bootstrap-sha' config value.
            expectCommitsSinceSha(mock, {
                lastReleaseSha: 'some-sha-in-mains-history',
                commits,
            });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifestFileAtHEAD],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "some-sha-in-mains-history" using "bootstrap-sha"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Failed to get .release-please-manifest.json at some-sha-in-mains-history: 404',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Bootstrapping from .release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('boostraps from HEAD manifest if manifest was deleted in last release PR', async function () {
            // no previously merged PR found, will use this as bootstrap
            const manifest = false;
            const manifestFileAtHEAD = prettyJsonStringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                'release-type': 'node',
                'bump-minor-pre-major': true,
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg1)!: major new feature', [
                    'node/pkg1/src/foo.ts',
                ]),
                helpers_1.buildMockCommit('feat(@node/pkg2): new feature', [
                    'node/pkg2/src/bar.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifestFileAtHEAD],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Failed to get .release-please-manifest.json at abc123: 404',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Bootstrapping from .release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Node(@node/pkg2)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
    });
    mocha_1.describe('githubRelease', () => {
        mocha_1.it('releases python and node packages', async () => {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = JSON.stringify({
                packages: {
                    'node/pkg1': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                        draft: true,
                    },
                },
            });
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, {
                lastReleaseSha,
                mergedPRFiles: [
                    // lack of any "node/pkg2/ files indicates that package did not
                    // change in the last merged PR.
                    'node/pkg1/package.json',
                    'node/pkg1/CHANGELOG.md',
                    'python/setup.py',
                    'python/CHANGELOG.md',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                    '.release-please-manifest.json',
                ],
            });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg1/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                    ['node/pkg1/CHANGELOG.md', '#Changelog\n\n## v3.2.1\n\n* entry'],
                    ['python/CHANGELOG.md', '#Changelog\n\n## v1.2.3\n\n* entry'],
                ],
            });
            expectLabelAndComment(mock, {
                addLabel: 'autorelease: tagged',
                removeLabel: 'autorelease: pending',
                prComments: [
                    ':robot: Release for @node/pkg1 is at https://pkg1@3.2.1:html :sunflower:',
                    ':robot: Release for foolib is at https://foolib@1.2.3:html :sunflower:',
                ],
            });
            mock
                .expects('createRelease')
                .withArgs('@node/pkg1', 'pkg1-v3.2.1', lastReleaseSha, sinon.match.string, false)
                .once()
                .resolves({
                name: '@node/pkg1 pkg1-v3.2.1',
                tag_name: 'pkg1-v3.2.1',
                draft: false,
                body: '',
                html_url: 'https://pkg1@3.2.1:html',
                upload_url: 'https://pkg1@3.2.1:upload',
            });
            mock
                .expects('createRelease')
                .withArgs('foolib', 'foolib-v1.2.3', lastReleaseSha, sinon.match.string, true)
                .once()
                .resolves({
                name: 'foolib foolib-v1.2.3',
                tag_name: 'foolib-v1.2.3',
                draft: true,
                body: '',
                html_url: 'https://foolib@1.2.3:html',
                upload_url: 'https://foolib@1.2.3:upload',
            });
            const releases = await new manifest_1.Manifest({ github }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.eql({
                'node/pkg1': {
                    version: '3.2.1',
                    major: 3,
                    minor: 2,
                    patch: 1,
                    pr: 22,
                    draft: false,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://pkg1@3.2.1:html',
                    tag_name: 'pkg1-v3.2.1',
                    name: '@node/pkg1 pkg1-v3.2.1',
                    upload_url: 'https://pkg1@3.2.1:upload',
                },
                python: {
                    version: '1.2.3',
                    major: 1,
                    minor: 2,
                    patch: 3,
                    pr: 22,
                    draft: true,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://foolib@1.2.3:html',
                    tag_name: 'foolib-v1.2.3',
                    name: 'foolib foolib-v1.2.3',
                    upload_url: 'https://foolib@1.2.3:upload',
                },
            });
        });
        mocha_1.it('logs when no last mergedPR found', async () => {
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock);
            expectPR(mock);
            expectGetFiles(mock, {
                inlineFiles: [
                    // minimal manifest/config to pass validation
                    ['.release-please-manifest.json', '{}'],
                    ['release-please-config.json', '{"packages": {"path":{}}}'],
                ],
            });
            expectLabelAndComment(mock);
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.be.undefined;
            chai_1.expect(logs).to.eql([
                [
                    'Unable to find last merged Manifest PR for tagging',
                    checkpoint_1.CheckpointType.Failure,
                ],
            ]);
        });
        mocha_1.it('logs when last mergedPR found is already released', async () => {
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock);
            expectPR(mock, { mergedPRLabels: ['autorelease: tagged'], lastReleaseSha });
            expectGetFiles(mock, {
                inlineFiles: [
                    // minimal manifest/config to pass validation
                    ['.release-please-manifest.json', '{}'],
                    ['release-please-config.json', '{"packages": {"path":{}}}'],
                ],
            });
            expectLabelAndComment(mock);
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.be.undefined;
            chai_1.expect(logs).to.eql([
                [
                    'Releases already created for last merged release PR',
                    checkpoint_1.CheckpointType.Success,
                ],
            ]);
        });
        mocha_1.it('logs when last mergedPR found is missing labels', async () => {
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock);
            expectPR(mock, { mergedPRLabels: [], lastReleaseSha });
            expectGetFiles(mock, {
                inlineFiles: [
                    // minimal manifest/config to pass validation
                    ['.release-please-manifest.json', '{}'],
                    ['release-please-config.json', '{"packages": {"path":{}}}'],
                ],
            });
            expectLabelAndComment(mock);
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.be.undefined;
            chai_1.expect(logs).to.eql([
                [
                    'Warning: last merged PR(#22) is missing label ' +
                        '"autorelease: pending" but has not yet been labeled ' +
                        '"autorelease: tagged". If PR(#22) is meant to be a release PR, ' +
                        'please apply the label "autorelease: pending".',
                    checkpoint_1.CheckpointType.Failure,
                ],
            ]);
        });
        mocha_1.it('logs a user deleting a manifest entry before merging last PR', async () => {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
            });
            const config = JSON.stringify({
                packages: {
                    'node/pkg1': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, {
                lastReleaseSha,
                mergedPRFiles: [
                    'node/pkg1/package.json',
                    'node/pkg1/CHANGELOG.md',
                    'python/setup.py',
                    'python/CHANGELOG.md',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                    '.release-please-manifest.json',
                ],
            });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg1/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                    ['node/pkg1/CHANGELOG.md', '#Changelog\n\n## v3.2.1\n\n* entry'],
                ],
            });
            expectLabelAndComment(mock, {
                addLabel: 'autorelease: tagged',
                removeLabel: 'autorelease: pending',
                prComments: [
                    ':robot: Release for @node/pkg1 is at https://pkg1@3.2.1:html :sunflower:',
                ],
            });
            mock
                .expects('createRelease')
                .withArgs('@node/pkg1', 'pkg1-v3.2.1', lastReleaseSha, sinon.match.string, false)
                .once()
                .resolves({
                name: '@node/pkg1 pkg1-v3.2.1',
                tag_name: 'pkg1-v3.2.1',
                draft: false,
                body: '',
                html_url: 'https://pkg1@3.2.1:html',
                upload_url: 'https://pkg1@3.2.1:upload',
            });
            mock
                .expects('createRelease')
                .withArgs('foolib', 'foolib-v1.2.3', lastReleaseSha, sinon.match.string, false)
                .never();
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.eql({
                'node/pkg1': {
                    version: '3.2.1',
                    major: 3,
                    minor: 2,
                    patch: 1,
                    pr: 22,
                    draft: false,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://pkg1@3.2.1:html',
                    tag_name: 'pkg1-v3.2.1',
                    name: '@node/pkg1 pkg1-v3.2.1',
                    upload_url: 'https://pkg1@3.2.1:upload',
                },
                python: undefined,
            });
            // python entry was manually deleted from manifest (user error)
            // log the problem, continue releasing other pkgs from manifest
            chai_1.expect(logs).to.eql([
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Failed to find version for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Bootstrapping from .release-please-manifest.json at tip of main ' +
                        'for missing paths [python]',
                    checkpoint_1.CheckpointType.Failure,
                ],
                [
                    'Failed to find version for python in ' +
                        '.release-please-manifest.json at tip of main',
                    checkpoint_1.CheckpointType.Failure,
                ],
                ['Creating release for Node(@node/pkg1)@3.2.1', checkpoint_1.CheckpointType.Success],
                [
                    'Unable to find last version for Python(foolib).',
                    checkpoint_1.CheckpointType.Failure,
                ],
            ]);
        });
        mocha_1.it('logs transient pkg release creation errors', async () => {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = JSON.stringify({
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, {
                lastReleaseSha,
                mergedPRFiles: [
                    'node/pkg1/package.json',
                    'node/pkg1/CHANGELOG.md',
                    'node/pkg2/package.json',
                    'node/pkg2/CHANGELOG.md',
                    'python/setup.py',
                    'python/CHANGELOG.md',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                    '.release-please-manifest.json',
                ],
            });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg1/package.json', 'node/pkg2/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                    ['node/pkg1/CHANGELOG.md', '#Changelog\n\n## v3.2.1\n\n* entry'],
                    ['node/pkg2/CHANGELOG.md', '#Changelog\n\n## v0.1.2\n\n* entry'],
                    ['python/CHANGELOG.md', '#Changelog\n\n## v1.2.3\n\n* entry'],
                ],
            });
            expectLabelAndComment(mock, {
                prComments: [
                    ':robot: Release for @node/pkg1 is at https://pkg1@3.2.1:html :sunflower:',
                    ':robot: Failed to create release for @node/pkg2 :cloud:',
                    ':robot: Release for foolib is at https://foolib@1.2.3:html :sunflower:',
                ],
            });
            mock
                .expects('createRelease')
                .withArgs('@node/pkg1', 'pkg1-v3.2.1', lastReleaseSha, sinon.match.string, false)
                .once()
                .resolves({
                name: '@node/pkg1 pkg1-v3.2.1',
                tag_name: 'pkg1-v3.2.1',
                draft: false,
                body: '',
                html_url: 'https://pkg1@3.2.1:html',
                upload_url: 'https://pkg1@3.2.1:upload',
            });
            mock
                .expects('createRelease')
                .withArgs('@node/pkg2', 'pkg2-v0.1.2', lastReleaseSha, sinon.match.string, false)
                .once()
                .rejects(new Error('Boom!'));
            mock
                .expects('createRelease')
                .withArgs('foolib', 'foolib-v1.2.3', lastReleaseSha, sinon.match.string, false)
                .once()
                .resolves({
                name: 'foolib foolib-v1.2.3',
                tag_name: 'foolib-v1.2.3',
                draft: false,
                body: '',
                html_url: 'https://foolib@1.2.3:html',
                upload_url: 'https://foolib@1.2.3:upload',
            });
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.eql({
                'node/pkg1': {
                    version: '3.2.1',
                    major: 3,
                    minor: 2,
                    patch: 1,
                    pr: 22,
                    draft: false,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://pkg1@3.2.1:html',
                    tag_name: 'pkg1-v3.2.1',
                    name: '@node/pkg1 pkg1-v3.2.1',
                    upload_url: 'https://pkg1@3.2.1:upload',
                },
                'node/pkg2': undefined,
                python: {
                    version: '1.2.3',
                    major: 1,
                    minor: 2,
                    patch: 3,
                    pr: 22,
                    draft: false,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://foolib@1.2.3:html',
                    tag_name: 'foolib-v1.2.3',
                    name: 'foolib foolib-v1.2.3',
                    upload_url: 'https://foolib@1.2.3:upload',
                },
            });
            chai_1.expect(logs).to.eql([
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Creating release for Node(@node/pkg1)@3.2.1', checkpoint_1.CheckpointType.Success],
                ['Creating release for Node(@node/pkg2)@0.1.2', checkpoint_1.CheckpointType.Success],
                [
                    // node/pkg2 failed when we tried to create it.
                    'Failed to create release for Node(@node/pkg2)@0.1.2: Boom!',
                    checkpoint_1.CheckpointType.Failure,
                ],
                ['Creating release for Python(foolib)@1.2.3', checkpoint_1.CheckpointType.Success],
            ]);
        });
        mocha_1.it('gracefully handles re-running after node/pkg2 failure', async () => {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = JSON.stringify({
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, {
                lastReleaseSha,
                mergedPRFiles: [
                    'node/pkg1/package.json',
                    'node/pkg1/CHANGELOG.md',
                    'node/pkg2/package.json',
                    'node/pkg2/CHANGELOG.md',
                    'python/setup.py',
                    'python/CHANGELOG.md',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                    '.release-please-manifest.json',
                ],
            });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg1/package.json', 'node/pkg2/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                    ['node/pkg1/CHANGELOG.md', '#Changelog\n\n## v3.2.1\n\n* entry'],
                    ['node/pkg2/CHANGELOG.md', '#Changelog\n\n## v0.1.2\n\n* entry'],
                    ['python/CHANGELOG.md', '#Changelog\n\n## v1.2.3\n\n* entry'],
                ],
            });
            expectLabelAndComment(mock, {
                addLabel: 'autorelease: tagged',
                removeLabel: 'autorelease: pending',
                prComments: [
                    ':robot: Release for @node/pkg2 is at https://pkg2@0.1.2:html :sunflower:',
                ],
            });
            class AlreadyExistsError extends Error {
                constructor() {
                    super(...arguments);
                    this.status = 422;
                    this.errors = [{ code: 'already_exists', field: 'tag_name' }];
                }
            }
            // @node/pkg1 and foolib releases were created successfully in last run but
            // @node/pkg2 had errored out. Rerunning we get 422/already_exists errors
            // for the first two.
            mock
                .expects('createRelease')
                .withArgs('@node/pkg1', 'pkg1-v3.2.1', lastReleaseSha, sinon.match.string, false)
                .once()
                .rejects(new AlreadyExistsError('Invalid Input'));
            mock
                .expects('createRelease')
                .withArgs('@node/pkg2', 'pkg2-v0.1.2', lastReleaseSha, sinon.match.string, false)
                .once()
                .resolves({
                name: '@node/pkg2 pkg2-v0.1.2',
                tag_name: 'pkg2-v0.1.2',
                draft: false,
                body: '',
                html_url: 'https://pkg2@0.1.2:html',
                upload_url: 'https://pkg2@0.1.2:upload',
            });
            mock
                .expects('createRelease')
                .withArgs('foolib', 'foolib-v1.2.3', lastReleaseSha, sinon.match.string, false)
                .once()
                .rejects(new AlreadyExistsError('Invalid Input'));
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.eql({
                'node/pkg1': undefined,
                'node/pkg2': {
                    version: '0.1.2',
                    major: 0,
                    minor: 1,
                    patch: 2,
                    pr: 22,
                    draft: false,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://pkg2@0.1.2:html',
                    tag_name: 'pkg2-v0.1.2',
                    name: '@node/pkg2 pkg2-v0.1.2',
                    upload_url: 'https://pkg2@0.1.2:upload',
                },
                python: undefined,
            });
            chai_1.expect(logs).to.eql([
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.1.2 for node/pkg2 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Creating release for Node(@node/pkg1)@3.2.1', checkpoint_1.CheckpointType.Success],
                [
                    'Release for Node(@node/pkg1)@3.2.1 already exists',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Creating release for Node(@node/pkg2)@0.1.2', checkpoint_1.CheckpointType.Success],
                ['Creating release for Python(foolib)@1.2.3', checkpoint_1.CheckpointType.Success],
                [
                    'Release for Python(foolib)@1.2.3 already exists',
                    checkpoint_1.CheckpointType.Success,
                ],
            ]);
        });
        mocha_1.it('handles non-already_exists 422 error ', async () => {
            const manifest = JSON.stringify({
                'node/pkg1': '3.2.1',
            });
            const config = JSON.stringify({
                packages: {
                    'node/pkg1': {},
                },
            });
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, {
                lastReleaseSha,
                mergedPRFiles: [
                    'node/pkg1/package.json',
                    'node/pkg1/CHANGELOG.md',
                    '.release-please-manifest.json',
                ],
            });
            expectGetFiles(mock, {
                fixtureFiles: ['node/pkg1/package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                    ['node/pkg1/CHANGELOG.md', '#Changelog\n\n## v3.2.1\n\n* entry'],
                ],
            });
            expectLabelAndComment(mock, {
                prComments: [':robot: Failed to create release for @node/pkg1 :cloud:'],
            });
            class ValidationError extends Error {
                constructor() {
                    super(...arguments);
                    this.status = 422;
                }
            }
            mock
                .expects('createRelease')
                .withArgs('@node/pkg1', 'pkg1-v3.2.1', lastReleaseSha, sinon.match.string, false)
                .once()
                .rejects(new ValidationError('A different 422'));
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const releases = await new manifest_1.Manifest({ github, checkpoint }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.eql({ 'node/pkg1': undefined });
            chai_1.expect(logs).to.eql([
                [
                    'Found version 3.2.1 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Creating release for Node(@node/pkg1)@3.2.1', checkpoint_1.CheckpointType.Success],
                [
                    // an 'already_exists' 422 would have logged as:
                    // "Release ... already exists" / CheckpointType.Success
                    'Failed to create release for Node(@node/pkg1)@3.2.1: A different 422',
                    checkpoint_1.CheckpointType.Failure,
                ],
            ]);
        });
        mocha_1.it('releases library in root (".")', async () => {
            const manifest = JSON.stringify({
                '.': '3.2.1',
            });
            const config = JSON.stringify({
                packages: {
                    '.': {},
                },
            });
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, {
                lastReleaseSha,
                mergedPRFiles: [
                    // lack of any "node/pkg2/ files indicates that package did not
                    // change in the last merged PR.
                    'package.json',
                    'CHANGELOG.md',
                ],
            });
            expectGetFiles(mock, {
                fixtureFiles: ['package.json'],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                    ['CHANGELOG.md', '#Changelog\n\n## v3.2.1\n\n* entry'],
                ],
            });
            expectLabelAndComment(mock, {
                addLabel: 'autorelease: tagged',
                removeLabel: 'autorelease: pending',
                prComments: [
                    ':robot: Release for googleapis is at https://googleapis@3.2.1:html :sunflower:',
                ],
            });
            mock
                .expects('createRelease')
                .withArgs('googleapis', 'googleapis-v3.2.1', lastReleaseSha, sinon.match.string, false)
                .once()
                .resolves({
                name: 'googleapis googleapis-v3.2.1',
                tag_name: 'googleapis-v3.2.1',
                draft: false,
                body: '',
                html_url: 'https://googleapis@3.2.1:html',
                upload_url: 'https://googleapis@3.2.1:upload',
            });
            const releases = await new manifest_1.Manifest({ github }).githubRelease();
            mock.verify();
            chai_1.expect(releases).to.eql({
                '.': {
                    version: '3.2.1',
                    major: 3,
                    minor: 2,
                    patch: 1,
                    pr: 22,
                    draft: false,
                    body: '',
                    sha: 'abc123',
                    html_url: 'https://googleapis@3.2.1:html',
                    tag_name: 'googleapis-v3.2.1',
                    name: 'googleapis googleapis-v3.2.1',
                    upload_url: 'https://googleapis@3.2.1:upload',
                },
            });
        });
    });
    mocha_1.describe('validate', () => {
        const entryPoints = [
            'pullRequest',
            'githubRelease',
        ];
        const invalidConfigs = [
            {
                setupName: 'invalid json',
                manifest: 'foo',
                config: 'bar',
                expectedLogs: [
                    [
                        'Invalid JSON in release-please-config.json',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                    [
                        'Invalid JSON in .release-please-manifest.json',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                ],
            },
            {
                setupName: 'no config.packages, bad manifest format',
                manifest: '{"path": 1}',
                config: '{"release-type": "node"}',
                expectedLogs: [
                    [
                        'No packages found: release-please-config.json',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                    [
                        '.release-please-manifest.json must only contain string values',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                ],
            },
            {
                setupName: 'valid config, invalid manifest',
                manifest: '{"path": 1}',
                config: '{"packages":{"foo":{}}}',
                expectedLogs: [
                    [
                        '.release-please-manifest.json must only contain string values',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                ],
            },
        ];
        for (const method of entryPoints) {
            for (const test of invalidConfigs) {
                const { config, manifest, expectedLogs, setupName } = test;
                mocha_1.it(`validates manifest and config in ${method} for ${setupName}`, async () => {
                    const github = new github_1.GitHub({
                        owner: 'fake',
                        repo: 'repo',
                        defaultBranch,
                    });
                    const mock = mockGithub(github);
                    expectGetFiles(mock, {
                        inlineFiles: [
                            ['release-please-config.json', config],
                            ['.release-please-manifest.json', manifest],
                        ],
                    });
                    const logs = [];
                    const checkpoint = (msg, type) => logs.push([msg, type]);
                    const m = new manifest_1.Manifest({ github, checkpoint });
                    const result = await m[method]();
                    mock.verify();
                    chai_1.expect(result).to.be.undefined;
                    chai_1.expect(logs).to.eql(expectedLogs);
                });
            }
            mocha_1.it(`is missing config for ${method}`, async () => {
                const github = new github_1.GitHub({
                    owner: 'fake',
                    repo: 'repo',
                    defaultBranch,
                });
                sandbox
                    .stub(github, 'getFileContentsOnBranch')
                    .rejects(Object.assign(Error('not found'), { status: 404 }));
                const logs = [];
                const checkpoint = (msg, type) => logs.push([msg, type]);
                const m = new manifest_1.Manifest({ github, checkpoint });
                await m[method]();
                chai_1.expect(logs).to.eql([
                    [
                        'Failed to get release-please-config.json at HEAD: 404',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                    [
                        'Unable to getConfigJson(release-please-config.json): not found',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                    [
                        'Failed to get .release-please-manifest.json at HEAD: 404',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                    [
                        'Unable to getManifestJson(.release-please-manifest.json): not found',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                ]);
            });
            mocha_1.it(`is missing manifest for ${method}`, async () => {
                const github = new github_1.GitHub({
                    owner: 'fake',
                    repo: 'repo',
                    defaultBranch,
                });
                const stub = sandbox.stub(github, 'getFileContentsOnBranch');
                stub.withArgs('release-please-config.json', defaultBranch).resolves({
                    sha: '',
                    content: '',
                    parsedContent: '{"packages": {"path":{}}}',
                });
                stub
                    .withArgs('.release-please-manifest.json', defaultBranch)
                    .rejects(Object.assign(Error('not found'), { status: 404 }));
                const logs = [];
                const checkpoint = (msg, type) => logs.push([msg, type]);
                const m = new manifest_1.Manifest({ github, checkpoint });
                await m[method]();
                chai_1.expect(logs).to.eql([
                    [
                        'Failed to get .release-please-manifest.json at HEAD: 404',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                    [
                        'Unable to getManifestJson(.release-please-manifest.json): not found',
                        checkpoint_1.CheckpointType.Failure,
                    ],
                ]);
            });
        }
    });
    mocha_1.describe('plugins', () => {
        mocha_1.it('runs the node-workspace plugin', async function () {
            const manifest = prettyJsonStringify({
                'node/pkg1': '0.123.4',
                'node/pkg2': '0.1.2',
                python: '1.2.3',
            });
            const config = prettyJsonStringify({
                plugins: ['node-workspace'],
                packages: {
                    'node/pkg1': {},
                    'node/pkg2': {},
                    python: {
                        'release-type': 'python',
                        'package-name': 'foolib',
                    },
                },
            });
            const commits = [
                helpers_1.buildMockCommit('fix(foolib): bufix python foolib', [
                    'python/src/foolib/foo.py',
                ]),
                helpers_1.buildMockCommit('fix(@node/pkg1): bugfix pkg1', [
                    'node/pkg1/src/foo.ts',
                ]),
            ];
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch,
            });
            const mock = mockGithub(github);
            expectManifest(mock, { manifest, lastReleaseSha });
            expectPR(mock, { lastReleaseSha });
            expectCommitsSinceSha(mock, { commits, lastReleaseSha });
            expectGetFiles(mock, {
                fixtureFiles: [
                    'node/pkg1/package.json',
                    'node/pkg2/package.json',
                    'python/setup.py',
                    'python/setup.cfg',
                    'python/src/foolib/version.py',
                ],
                inlineFiles: [
                    ['release-please-config.json', config],
                    ['.release-please-manifest.json', manifest],
                ],
            });
            expectLabelAndComment(mock, { addLabel });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const pr = await new manifest_1.Manifest({ github, checkpoint }).pullRequest();
            mock.verify();
            chai_1.expect(pr).to.equal(22);
            chai_1.expect(logs).to.eql([
                [
                    'Found last release sha "abc123" using "last-release-pr"',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 0.123.4 for node/pkg1 in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                [
                    'Found version 1.2.3 for python in ' +
                        '.release-please-manifest.json at abc123 of main',
                    checkpoint_1.CheckpointType.Success,
                ],
                ['Processing package: Node(@node/pkg1)', checkpoint_1.CheckpointType.Success],
                ['Processing package: Python(foolib)', checkpoint_1.CheckpointType.Success],
            ]);
        });
    });
});
//# sourceMappingURL=manifest.js.map