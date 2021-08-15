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
const nock = require("nock");
const rust_1 = require("../../src/releasers/rust");
const sinon = require("sinon");
const helpers_1 = require("../helpers");
const fs_1 = require("fs");
const path_1 = require("path");
const github_1 = require("../../src/github");
nock.disableNetConnect();
const sandbox = sinon.createSandbox();
const fixturesPath = './test/releasers/fixtures/rust';
mocha_1.describe('Rust', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('run', () => {
        function runTests(opts) {
            const suffix = `${opts.hasCargoLock ? 'with' : 'without'} Cargo.lock`;
            mocha_1.it(`creates a release PR for non-monorepo ${suffix}`, async function () {
                const releasePR = new rust_1.Rust({
                    github: new github_1.GitHub({ owner: 'fasterthanlime', repo: 'rust-test-repo' }),
                    packageName: 'crate1',
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .stub(releasePR.gh, 'commitsSinceSha')
                    .returns(Promise.resolve(helpers_1.readPOJO('commits-fix')));
                // See if there are any release PRs already open, we do this as
                // we consider opening a new release-pr:
                sandbox
                    .stub(releasePR.gh, 'findOpenReleasePRs')
                    .returns(Promise.resolve([]));
                // Look up the default branch name:
                sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
                // Fetch files from GitHub, in prep to update with code-suggester:
                const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
                // 'Cargo.toml' exists and is for a single package:
                const manifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo-crate1.toml'), 'utf8');
                getFileContentsStub.withArgs('Cargo.toml', 'main').resolves({
                    sha: 'abc123',
                    content: Buffer.from(manifestContent, 'utf8').toString('base64'),
                    parsedContent: manifestContent,
                });
                if (opts.hasCargoLock) {
                    // `Cargo.lock` exists and is for a single package. note: the same
                    // fixture as the monorepo case is used, it doesn't matter much.
                    const lockfileContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo.lock'), 'utf8');
                    getFileContentsStub.withArgs('Cargo.lock', 'main').resolves({
                        sha: 'abc123',
                        content: Buffer.from(lockfileContent, 'utf8').toString('base64'),
                        parsedContent: lockfileContent,
                    });
                }
                // Nothing else exists:
                getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
                // Call to add autorelease: pending label:
                sandbox.stub(releasePR.gh, 'addLabels');
                helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
                await releasePR.run();
            });
            mocha_1.it(`creates a release PR for monorepo ${suffix}`, async function () {
                const releasePR = new rust_1.Rust({
                    github: new github_1.GitHub({ owner: 'fasterthanlime', repo: 'rust-test-repo' }),
                    packageName: 'crate1',
                    path: 'crates/crate1',
                    monorepoTags: true,
                });
                // Indicates that there are no PRs currently waiting to be released:
                sandbox
                    .stub(releasePR.gh, 'findMergedReleasePR')
                    .returns(Promise.resolve(undefined));
                // Return latest tag used to determine next version #:
                sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                    sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                    name: 'crate1-v0.123.4',
                    version: '0.123.4',
                }));
                // Commits, used to build CHANGELOG, and propose next version bump:
                sandbox
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .stub(releasePR.gh, 'commitsSinceSha')
                    .returns(Promise.resolve(helpers_1.readPOJO('commits-fix')));
                // See if there are any release PRs already open, we do this as
                // we consider opening a new release-pr:
                sandbox
                    .stub(releasePR.gh, 'findOpenReleasePRs')
                    .returns(Promise.resolve([]));
                // Look up the default branch name:
                sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
                // Fetch files from GitHub, in prep to update with code-suggester:
                const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
                // 'Cargo.toml' exists and is for the workspace
                const workspaceManifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo-workspace.toml'), 'utf8');
                getFileContentsStub.withArgs('Cargo.toml', 'main').resolves({
                    sha: 'abc123',
                    content: Buffer.from(workspaceManifestContent, 'utf8').toString('base64'),
                    parsedContent: workspaceManifestContent,
                });
                // 'crates/crate1/Cargo.toml' exists and is for the `crate1` package
                const crate1ManifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo-crate1.toml'), 'utf8');
                getFileContentsStub
                    .withArgs('crates/crate1/Cargo.toml', 'main')
                    .resolves({
                    sha: 'abc123',
                    content: Buffer.from(crate1ManifestContent, 'utf8').toString('base64'),
                    parsedContent: crate1ManifestContent,
                });
                // 'crates/crate2/Cargo.toml' exists and is for the `crate2` package
                const crate2ManifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo-crate2.toml'), 'utf8');
                getFileContentsStub
                    .withArgs('crates/crate2/Cargo.toml', 'main')
                    .resolves({
                    sha: 'abc123',
                    content: Buffer.from(crate2ManifestContent, 'utf8').toString('base64'),
                    parsedContent: crate2ManifestContent,
                });
                if (opts.hasCargoLock) {
                    // a top-level `Cargo.lock` exists and is for both packages
                    const lockfileContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo.lock'), 'utf8');
                    getFileContentsStub.withArgs('Cargo.lock', 'main').resolves({
                        sha: 'abc123',
                        content: Buffer.from(lockfileContent, 'utf8').toString('base64'),
                        parsedContent: lockfileContent,
                    });
                }
                // Nothing else exists:
                getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
                // Call to add autorelease: pending label:
                sandbox.stub(releasePR.gh, 'addLabels');
                helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
                await releasePR.run();
            });
            mocha_1.it(`creates a release PR for manifest releaser for monorepo ${suffix}`, async function () {
                const releasePR = new rust_1.Rust({
                    github: new github_1.GitHub({ owner: 'fasterthanlime', repo: 'rust-test-repo' }),
                    packageName: 'crate1',
                    path: 'crates/crate1',
                    monorepoTags: true,
                    skipDependencyUpdates: true,
                });
                // Indicates that there are no PRs currently waiting to be released:
                sandbox
                    .stub(releasePR.gh, 'findMergedReleasePR')
                    .returns(Promise.resolve(undefined));
                // Return latest tag used to determine next version #:
                sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                    sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                    name: 'crate1-v0.123.4',
                    version: '0.123.4',
                }));
                // Commits, used to build CHANGELOG, and propose next version bump:
                sandbox
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .stub(releasePR.gh, 'commitsSinceSha')
                    .returns(Promise.resolve(helpers_1.readPOJO('commits-fix')));
                // See if there are any release PRs already open, we do this as
                // we consider opening a new release-pr:
                sandbox
                    .stub(releasePR.gh, 'findOpenReleasePRs')
                    .returns(Promise.resolve([]));
                // Look up the default branch name:
                sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
                // Fetch files from GitHub, in prep to update with code-suggester:
                const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
                // 'Cargo.toml' exists and is for the workspace
                const workspaceManifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo-workspace.toml'), 'utf8');
                getFileContentsStub.withArgs('Cargo.toml', 'main').resolves({
                    sha: 'abc123',
                    content: Buffer.from(workspaceManifestContent, 'utf8').toString('base64'),
                    parsedContent: workspaceManifestContent,
                });
                // 'crates/crate1/Cargo.toml' exists and is for the `crate1` package
                const crate1ManifestContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo-crate1.toml'), 'utf8');
                getFileContentsStub
                    .withArgs('crates/crate1/Cargo.toml', 'main')
                    .resolves({
                    sha: 'abc123',
                    content: Buffer.from(crate1ManifestContent, 'utf8').toString('base64'),
                    parsedContent: crate1ManifestContent,
                });
                // 'crates/crate2/Cargo.toml' should never even be accessed, because
                // we're working for the manifest releaser and so we're not bumping
                // dependencies.
                if (opts.hasCargoLock) {
                    // a top-level `Cargo.lock` exists and is for both packages
                    const lockfileContent = fs_1.readFileSync(path_1.resolve(fixturesPath, 'Cargo.lock'), 'utf8');
                    getFileContentsStub.withArgs('Cargo.lock', 'main').resolves({
                        sha: 'abc123',
                        content: Buffer.from(lockfileContent, 'utf8').toString('base64'),
                        parsedContent: lockfileContent,
                    });
                }
                // Nothing else exists:
                getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
                // Call to add autorelease: pending label:
                sandbox.stub(releasePR.gh, 'addLabels');
                helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
                await releasePR.run();
            });
        }
        runTests({ hasCargoLock: false });
        runTests({ hasCargoLock: true });
        mocha_1.it('does not support snapshot releases', async () => {
            const releasePR = new rust_1.Rust({
                github: new github_1.GitHub({ owner: 'fasterthanlime', repo: 'rust-test-repo' }),
                packageName: 'crate1',
                snapshot: true,
            });
            const pr = await releasePR.run();
            assert.strictEqual(pr, undefined);
        });
    });
});
//# sourceMappingURL=rust.js.map