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
const ocaml_1 = require("../../src/releasers/ocaml");
const sinon = require("sinon");
const helpers_1 = require("../helpers");
const fs_1 = require("fs");
const path_1 = require("path");
const github_1 = require("../../src/github");
nock.disableNetConnect();
const sandbox = sinon.createSandbox();
const fixturesPath = './test/releasers/fixtures/ocaml';
mocha_1.describe('OCaml', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('run', () => {
        const suites = [
            { esy: ['esy.json'], opam: ['sample.opam'] },
            { esy: ['esy.json'], opam: [] },
            { esy: [], opam: ['sample.opam'] },
            { esy: ['package.json'], opam: [] },
        ];
        suites.forEach(({ esy, opam }) => {
            let suiteName = esy.join(',');
            if (esy.length && opam.length) {
                suiteName += ' + ';
            }
            suiteName += opam.join(',');
            mocha_1.it(`creates a release PR for non-monorepo (${suiteName})`, async function () {
                const releasePR = new ocaml_1.OCaml({
                    github: new github_1.GitHub({ owner: 'phated', repo: 'ocaml-sample-repo' }),
                    packageName: 'sample',
                });
                // Indicates that there are no PRs currently waiting to be released:
                sandbox
                    .stub(releasePR.gh, 'findMergedReleasePR')
                    .returns(Promise.resolve(undefined));
                // Return latest tag used to determine next version #:
                sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                    sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                    name: 'v0.5.0',
                    version: '0.5.0',
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
                // Lookup the default branch name:
                sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
                // Fetch files from GitHub, in prep to update with code-suggester:
                const findFilesByExtensionStub = sandbox.stub(releasePR.gh, 'findFilesByExtension');
                findFilesByExtensionStub.withArgs('json').resolves(esy);
                findFilesByExtensionStub.withArgs('opam').resolves(opam);
                findFilesByExtensionStub.resolves([]);
                // Fetch files from GitHub, in prep to update with code-suggester:
                const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
                // 'esy.json' exists
                const esyJsonContents = fs_1.readFileSync(path_1.resolve(fixturesPath, 'esy.json'), 'utf8');
                esy.forEach(filename => {
                    getFileContentsStub.withArgs(filename, 'main').resolves({
                        sha: 'abc123',
                        content: Buffer.from(esyJsonContents, 'utf8').toString('base64'),
                        parsedContent: esyJsonContents,
                    });
                });
                // 'sample.opam' exists
                const opamContents = fs_1.readFileSync(path_1.resolve(fixturesPath, 'sample.opam'), 'utf8');
                opam.forEach(filename => {
                    getFileContentsStub.withArgs(filename, 'main').resolves({
                        sha: 'abc123',
                        content: Buffer.from(opamContents, 'utf8').toString('base64'),
                        parsedContent: opamContents,
                    });
                });
                // Nothing else exists:
                getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
                // Call to add autorelease: pending label:
                sandbox.stub(releasePR.gh, 'addLabels');
                helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
                await releasePR.run();
            });
        });
        mocha_1.it('skips JSON files that don\'t contain a "version" field', async function () {
            const releasePR = new ocaml_1.OCaml({
                github: new github_1.GitHub({ owner: 'phated', repo: 'ocaml-sample-repo' }),
                packageName: 'sample',
            });
            // Indicates that there are no PRs currently waiting to be released:
            sandbox
                .stub(releasePR.gh, 'findMergedReleasePR')
                .returns(Promise.resolve(undefined));
            // Return latest tag used to determine next version #:
            sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                name: 'v0.5.0',
                version: '0.5.0',
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
            // Lookup the default branch name:
            sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
            // Fetch files from GitHub, in prep to update with code-suggester:
            const findFilesByExtensionStub = sandbox.stub(releasePR.gh, 'findFilesByExtension');
            findFilesByExtensionStub.withArgs('json').resolves(['fixture.json']);
            findFilesByExtensionStub.withArgs('opam').resolves([]);
            findFilesByExtensionStub.resolves([]);
            // Fetch files from GitHub, in prep to update with code-suggester:
            const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
            getFileContentsStub.withArgs('fixture.json', 'main').resolves({
                sha: 'abc123',
                content: Buffer.from(JSON.stringify({ test: 'Test' }), 'utf8').toString('base64'),
                parsedContent: '{"test": "Test"}',
            });
            // Nothing else exists:
            getFileContentsStub.rejects(Object.assign(Error('not found'), { status: 404 }));
            // Call to add autorelease: pending label:
            sandbox.stub(releasePR.gh, 'addLabels');
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            await releasePR.run();
        });
        // TODO(blaine): Monorepo setup
        mocha_1.it('does not support snapshot releases', async () => {
            const releasePR = new ocaml_1.OCaml({
                github: new github_1.GitHub({ owner: 'phated', repo: 'ocaml-sample-repo' }),
                packageName: 'sample',
                snapshot: true,
            });
            const pr = await releasePR.run();
            assert.strictEqual(pr, undefined);
        });
    });
});
//# sourceMappingURL=ocaml.js.map