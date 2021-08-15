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
const cargo_workspace_1 = require("../../src/plugins/cargo-workspace");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon = require("sinon");
const github_1 = require("../../src/github");
const utils_1 = require("../releasers/utils");
const helpers_1 = require("../helpers");
const snapshot = require("snap-shot-it");
const sandbox = sinon.createSandbox();
function stringifyActual(actual) {
    let stringified = '';
    for (const pkgsWithPRData of actual) {
        const changes = pkgsWithPRData.prData.changes;
        stringified +=
            '='.repeat(20) +
                '\n' +
                JSON.stringify(pkgsWithPRData, (k, v) => (k === ' changes' ? undefined : v), 2) +
                '\n';
        stringified += helpers_1.stringifyExpectedChanges([...changes]) + '\n';
    }
    return stringified;
}
const pkgAData = {
    config: {
        releaseType: 'rust',
        packageName: 'pkgA',
        path: 'packages/pkgA',
    },
    prData: {
        version: '1.1.2',
        changes: new Map([
            [
                'packages/pkgA/Cargo.toml',
                {
                    content: `
        [package]
        name = "pkgA"
        version = "1.1.2"
        `,
                    mode: '100644',
                },
            ],
            [
                'packages/pkgA/CHANGELOG.md',
                {
                    content: '# Changelog' +
                        '\n\nAll notable changes to this project will be ' +
                        'documented in this file.' +
                        '\n\n### [1.1.2](https://www.github.com/fake/repo/compare' +
                        '/pkgA-v1.1.1...pkgA-v1.1.2) (1983-10-10)' +
                        '\n\n\n### Bug Fixes' +
                        '\n\n* We fixed a bug!',
                    mode: '100644',
                },
            ],
        ]),
    },
};
mocha_1.describe('CargoWorkspaceDependencyUpdates', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    function mockGithub(github) {
        return sandbox.mock(github);
    }
    function expectGetFiles(mock, namesContents) {
        for (const [file, contents] of namesContents) {
            if (typeof contents === 'string') {
                mock
                    .expects('getFileContentsOnBranch')
                    .withExactArgs(file, 'main')
                    .once()
                    .resolves(utils_1.buildGitHubFileRaw(contents));
            }
            else if (contents) {
                mock
                    .expects('getFileContentsOnBranch')
                    .withExactArgs(file, 'main')
                    .once()
                    .rejects(Object.assign(Error(`error: ${contents}`), { status: contents }));
            }
            else {
                mock
                    .expects('getFileContentsOnBranch')
                    .withExactArgs(file, 'main')
                    .never();
            }
        }
    }
    function makeGraph(nodes) {
        return new Map(nodes.map(n => [n.name, n]));
    }
    mocha_1.describe('post-order graph traversal', () => {
        mocha_1.it('visits nodes in post-order (a<-b<-c)', () => {
            const graphs = [
                makeGraph([
                    { name: 'a', deps: [] },
                    { name: 'b', deps: ['a'] },
                    { name: 'c', deps: ['b'] },
                ]),
                makeGraph([
                    { name: 'b', deps: ['a'] },
                    { name: 'a', deps: [] },
                    { name: 'c', deps: ['b'] },
                ]),
                makeGraph([
                    { name: 'c', deps: ['b'] },
                    { name: 'b', deps: ['a'] },
                    { name: 'a', deps: [] },
                ]),
                makeGraph([
                    { name: 'c', deps: ['b'] },
                    { name: 'a', deps: [] },
                    { name: 'b', deps: ['a'] },
                ]),
            ];
            for (const graph of graphs) {
                chai_1.expect(cargo_workspace_1.postOrder(graph)).to.eql(['a', 'b', 'c']);
            }
        });
        mocha_1.it('visits nodes in post-order (a->b->c)', () => {
            const graphs = [
                makeGraph([
                    { name: 'a', deps: ['b'] },
                    { name: 'b', deps: ['c'] },
                    { name: 'c', deps: [] },
                ]),
                makeGraph([
                    { name: 'b', deps: ['c'] },
                    { name: 'a', deps: ['b'] },
                    { name: 'c', deps: [] },
                ]),
                makeGraph([
                    { name: 'c', deps: [] },
                    { name: 'b', deps: ['c'] },
                    { name: 'a', deps: ['b'] },
                ]),
                makeGraph([
                    { name: 'c', deps: [] },
                    { name: 'a', deps: ['b'] },
                    { name: 'b', deps: ['c'] },
                ]),
            ];
            for (const graph of graphs) {
                chai_1.expect(cargo_workspace_1.postOrder(graph)).to.eql(['c', 'b', 'a']);
            }
        });
        mocha_1.it('visits nodes in post-order (a->b, a->c)', () => {
            const g = makeGraph([
                { name: 'a', deps: ['b', 'c'] },
                { name: 'b', deps: [] },
                { name: 'c', deps: [] },
            ]);
            chai_1.expect(cargo_workspace_1.postOrder(g)).to.eql(['b', 'c', 'a']);
        });
        mocha_1.it('visits nodes in post-order (diamond: a->b->d, a->c->d)', () => {
            let g = makeGraph([
                { name: 'a', deps: ['b', 'c'] },
                { name: 'b', deps: ['d'] },
                { name: 'c', deps: ['d'] },
                { name: 'd', deps: [] },
            ]);
            chai_1.expect(cargo_workspace_1.postOrder(g)).to.eql(['d', 'b', 'c', 'a']);
            g = makeGraph([
                { name: 'd', deps: [] },
                { name: 'b', deps: ['d'] },
                { name: 'a', deps: ['b', 'c'] },
                { name: 'c', deps: ['d'] },
            ]);
            chai_1.expect(cargo_workspace_1.postOrder(g)).to.eql(['d', 'b', 'c', 'a']);
        });
        mocha_1.it('visits nodes in post-order (a->b->c->d, a->d)', () => {
            let g = makeGraph([
                { name: 'a', deps: ['d', 'b'] },
                { name: 'b', deps: ['c'] },
                { name: 'c', deps: ['d'] },
                { name: 'd', deps: [] },
            ]);
            chai_1.expect(cargo_workspace_1.postOrder(g)).to.eql(['d', 'c', 'b', 'a']);
            g = makeGraph([
                { name: 'a', deps: ['b', 'd'] },
                { name: 'c', deps: ['d'] },
                { name: 'd', deps: [] },
                { name: 'b', deps: ['c'] },
            ]);
            chai_1.expect(cargo_workspace_1.postOrder(g)).to.eql(['d', 'c', 'b', 'a']);
        });
        mocha_1.it('refuses to visit cyclic graph', () => {
            const g = makeGraph([
                { name: 'a', deps: ['b'] },
                { name: 'b', deps: ['c'] },
                { name: 'c', deps: ['a'] },
            ]);
            chai_1.expect(() => cargo_workspace_1.postOrder(g)).to.throw();
        });
        mocha_1.it('refuses to graph with missing nodes', () => {
            const g = makeGraph([
                { name: 'a', deps: ['b'] },
                { name: 'b', deps: ['c'] },
            ]);
            chai_1.expect(() => cargo_workspace_1.postOrder(g)).to.throw();
        });
    });
    mocha_1.describe('run', () => {
        mocha_1.it('refuses to work on a directory that is not a cargo workspace', async () => {
            const config = {
                packages: {},
                parsedPackages: [{ path: 'packages/pkgA', releaseType: 'rust' }],
            };
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch: 'main',
            });
            const mock = mockGithub(github);
            expectGetFiles(mock, [
                [
                    'Cargo.toml',
                    `
          # woops, not a workspace
          [package]
          name = "foobar"
          version = "7.7.7"
        `,
                ],
            ]);
            // pkgA had a patch bump from manifest.runReleasers()
            const newManifestVersions = new Map([['packages/pkgA', '1.1.2']]);
            const pkgsWithPRData = [pkgAData];
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const cargoWS = new cargo_workspace_1.default(github, config, 'cargo-workspace', checkpoint);
            let caught;
            try {
                await cargoWS.run(newManifestVersions, pkgsWithPRData);
            }
            catch (err) {
                caught = err;
            }
            chai_1.expect(caught).to.be.ok;
        });
        mocha_1.it('refuses to work on a cargo workspace without members', async () => {
            const config = {
                packages: {},
                parsedPackages: [{ path: 'packages/pkgA', releaseType: 'rust' }],
            };
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch: 'main',
            });
            const mock = mockGithub(github);
            expectGetFiles(mock, [
                [
                    'Cargo.toml',
                    `
          [workspace]
          foo = "bar"
        `,
                ],
            ]);
            // pkgA had a patch bump from manifest.runReleasers()
            const newManifestVersions = new Map([['packages/pkgA', '1.1.2']]);
            const pkgsWithPRData = [pkgAData];
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const cargoWS = new cargo_workspace_1.default(github, config, 'cargo-workspace', checkpoint);
            let caught;
            try {
                await cargoWS.run(newManifestVersions, pkgsWithPRData);
            }
            catch (err) {
                caught = err;
            }
            chai_1.expect(caught).to.be.ok;
        });
        mocha_1.it('handles a simple chain where root pkg update cascades to dependents', async function () {
            const config = {
                packages: {},
                parsedPackages: [
                    { path: 'packages/pkgA', releaseType: 'rust' },
                    { path: 'packages/pkgB', releaseType: 'rust' },
                    { path: 'packages/pkgC', releaseType: 'rust' },
                    // should ignore non-rust packages
                    { path: 'py/pkg', releaseType: 'python' },
                ],
            };
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch: 'main',
            });
            const mock = mockGithub(github);
            // packages B and C did not get release-please updates but B depends on A
            // and C depends on B so both should be getting patch bumps
            expectGetFiles(mock, [
                [
                    'Cargo.toml',
                    `
          [workspace]
          members = ["packages/pkgA", "packages/pkgB", "packages/pkgC"]
        `,
                ],
                ['packages/pkgA/Cargo.toml', false],
                ['packages/pkgA/CHANGELOG.md', false],
                [
                    'packages/pkgB/Cargo.toml',
                    `
        [package]
        name = "pkgB"
        version = "2.2.2"

        [dependencies]
        pkgA = { version = "1.1.1", path = "../pkgA" }
        tracing = "1.0.0"
        `,
                ],
                [
                    'packages/pkgB/CHANGELOG.md',
                    '# Changelog' +
                        '\n\nAll notable changes to this project will be ' +
                        'documented in this file.' +
                        '\n\n### [2.2.2](https://www.github.com/fake/repo/compare' +
                        '/pkgB-v2.2.1...pkgB-v2.2.2) (1983-10-10)' +
                        '\n\n\n### Bug Fixes' +
                        '\n\n* We fixed a bug',
                ],
                [
                    'packages/pkgC/Cargo.toml',
                    `
        [package]
        name = "pkgC"
        version = "3.3.3"

        [dependencies]
        pkgB = { version = "2.2.2", path = "../pkgB" }
        rustls = "1.0.0"
        `,
                ],
                [
                    'Cargo.lock',
                    `
          # This file is automatically @generated by Cargo.
          # It is not intended for manual editing.
          [[package]]
          name = "pkgA"
          version = "1.1.1"
          dependencies = []

          [[package]]
          name = "pkgB"
          version = "2.2.2"
          dependencies = ["pkgA"]

          [[package]]
          name = "pkgC"
          version = "3.3.3"
          dependencies = ["pkgB"]
          `,
                ],
                ['packages/pkgC/CHANGELOG.md', ''],
            ]);
            // pkgA had a patch bump from manifest.runReleasers()
            const newManifestVersions = new Map([
                ['packages/pkgA', '1.1.2'],
                ['py/pkg', '1.1.2'],
            ]);
            // all incoming non-Rust changes should be left alone and returned
            const pyPkgData = {
                config: {
                    releaseType: 'python',
                    path: 'py/pkg',
                },
                prData: {
                    version: '1.1.2',
                    changes: new Map([
                        [
                            'py/pkg/setup.py',
                            {
                                content: 'some python version content',
                                mode: '100644',
                            },
                        ],
                    ]),
                },
            };
            const pkgsWithPRData = [
                pkgAData,
                pyPkgData,
            ];
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const cargoWS = new cargo_workspace_1.default(github, config, 'cargo-workspace', checkpoint);
            const [actualManifest, actualChanges] = await cargoWS.run(newManifestVersions, pkgsWithPRData);
            mock.verify();
            chai_1.expect([...actualManifest]).to.eql([
                ['packages/pkgA', '1.1.2'],
                ['py/pkg', '1.1.2'],
                ['packages/pkgB', '2.2.3'],
                ['packages/pkgC', '3.3.4'],
            ]);
            const snapPrefix = this.test.fullTitle();
            snapshot(snapPrefix + ' logs', logs);
            snapshot(snapPrefix + ' changes', stringifyActual(actualChanges));
        });
        mocha_1.it('handles a triangle: root and one leg updates bumps other leg', async function () {
            const config = {
                packages: {},
                parsedPackages: [
                    { path: 'packages/pkgA', releaseType: 'rust' },
                    { path: 'packages/pkgB', releaseType: 'rust' },
                    { path: 'packages/pkgC', releaseType: 'rust' },
                ],
            };
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch: 'main',
            });
            const mock = mockGithub(github);
            // package C did not get a release-please update but it depends on both
            // A and B which did get release-please bumps so it should receive a
            // patch bump
            expectGetFiles(mock, [
                [
                    'Cargo.toml',
                    `
        [workspace]
        members = ["packages/pkgA", "packages/pkgB", "packages/pkgC"]
        `,
                ],
                ['packages/pkgA/Cargo.toml', false],
                ['packages/pkgA/CHANGELOG.md', false],
                ['packages/pkgB/Cargo.toml', false],
                ['packages/pkgB/CHANGELOG.md', false],
                [
                    'packages/pkgC/Cargo.toml',
                    `
        [package]
        name = "pkgC"
        version = "3.3.3"

        [dependencies]
        pkgA = { version = "1.1.1", path = "../pkgA" }
        pkgB = { version = "2.2.2", path = "../pkgB" }

        [dependencies.anotherExternal]
        version = "4.3.1"
        `,
                ],
                [
                    'packages/pkgC/CHANGELOG.md',
                    '# Changelog' +
                        '\n\nAll notable changes to this project will be ' +
                        'documented in this file.' +
                        '\n\n### [3.3.3](https://www.github.com/fake/repo/compare' +
                        '/pkgC-v3.3.2...pkgC-v3.3.3) (1983-10-10)' +
                        '\n\n\n### Bug Fixes' +
                        '\n\n* We fixed a bug',
                ],
                [
                    'Cargo.lock',
                    `
          # This file is automatically @generated by Cargo.
          # It is not intended for manual editing.
          [[package]]
          name = "pkgA"
          version = "1.1.1"
          dependencies = []

          [[package]]
          name = "pkgB"
          version = "2.2.2"
          dependencies = []

          [[package]]
          name = "pkgC"
          version = "3.3.3"
          dependencies = ["pkgA", "pkgB", "anotherExternal"]
        `,
                ],
            ]);
            // pkgA had a patch bump and pkgB had a minor bump from
            // manifest.runReleasers()
            const newManifestVersions = new Map([
                ['packages/pkgA', '1.1.2'],
                ['packages/pkgB', '2.3.0'],
            ]);
            const pkgsWithPRData = [
                pkgAData,
                {
                    config: {
                        releaseType: 'rust',
                        packageName: 'pkgB',
                        path: 'packages/pkgB',
                    },
                    prData: {
                        version: '2.3.0',
                        changes: new Map([
                            [
                                'packages/pkgB/Cargo.toml',
                                {
                                    content: `
                [package]
                name = "pkgB"
                version = "2.3.0"

                [dependencies]
                # release-please does not update dependency versions
                pkgA = { version = "1.1.1", path = "../pkgA" }
                someExternal = "9.2.3"
                `,
                                    mode: '100644',
                                },
                            ],
                            [
                                'packages/pkgB/CHANGELOG.md',
                                {
                                    content: '# Changelog' +
                                        '\n\nAll notable changes to this project will be ' +
                                        'documented in this file.' +
                                        '\n\n### [2.3.0](https://www.github.com/fake/repo/compare' +
                                        '/pkgB-v2.2.2...pkgB-v2.3.0) (1983-10-10)' +
                                        '\n\n\n### Features' +
                                        '\n\n* We added a feature' +
                                        '\n\n### [2.2.2](https://www.github.com/fake/repo/compare' +
                                        '/pkgB-v2.2.1...pkgB-v2.2.2) (1983-10-10)' +
                                        '\n\n\n### Bug Fixes' +
                                        '\n\n* We fixed a bug',
                                    mode: '100644',
                                },
                            ],
                        ]),
                    },
                },
            ];
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const cargoWS = new cargo_workspace_1.default(github, config, 'cargo-workspace', checkpoint);
            const [actualManifest, actualChanges] = await cargoWS.run(newManifestVersions, pkgsWithPRData);
            mock.verify();
            chai_1.expect([...actualManifest]).to.eql([
                ['packages/pkgA', '1.1.2'],
                ['packages/pkgB', '2.3.0'],
                ['packages/pkgC', '3.3.4'],
            ]);
            const snapPrefix = this.test.fullTitle();
            snapshot(snapPrefix + ' logs', logs);
            snapshot(snapPrefix + ' changes', stringifyActual(actualChanges));
        });
        mocha_1.it('handles discontiguous graph', async function () {
            const config = {
                packages: {},
                parsedPackages: [
                    { path: 'packages/pkgA', releaseType: 'rust' },
                    { path: 'packages/pkgB', releaseType: 'rust' },
                    { path: 'packages/pkgAA', releaseType: 'rust' },
                    { path: 'packages/pkgBB', releaseType: 'rust' },
                ],
            };
            const github = new github_1.GitHub({
                owner: 'fake',
                repo: 'repo',
                defaultBranch: 'main',
            });
            const mock = mockGithub(github);
            // package B did not get a release-please updated but it depends on A
            // which did so it should patch bump
            // package BB did not get a release-please updated but it depends on AA
            // which did so it should patch bump
            expectGetFiles(mock, [
                [
                    'Cargo.toml',
                    `
        [workspace]
        members = [
          "packages/pkgA",
          "packages/pkgB",
          "packages/pkgAA",
          "packages/pkgBB",
        ]
        `,
                ],
                ['packages/pkgA/Cargo.toml', false],
                ['packages/pkgA/CHANGELOG.md', false],
                [
                    'packages/pkgB/Cargo.toml',
                    `
        [package]
        name = "pkgB"
        version = "2.2.2"

        [dependencies]
        pkgA = { version = "1.1.1", path = "../pkgA" }
        someExternal = "9.2.3"
        `,
                ],
                [
                    'packages/pkgB/CHANGELOG.md',
                    '# Changelog' +
                        '\n\nAll notable changes to this project will be ' +
                        'documented in this file.' +
                        '\n\n### [2.2.2](https://www.github.com/fake/repo/compare' +
                        '/pkgB-v2.2.1...pkgB-v2.2.2) (1983-10-10)' +
                        '\n\n\n### Bug Fixes' +
                        '\n\n* We fixed a bug\n',
                ],
                [
                    'packages/pkgBB/Cargo.toml',
                    `
        [package]
        name = "pkgBB"
        version = "22.2.2"

        [dependencies]
        pkgAA = { version = "11.1.1", path = "../pkgA" }
        someExternal = "9.2.3"
        `,
                ],
                [
                    'packages/pkgBB/CHANGELOG.md',
                    '# Changelog' +
                        '\n\nAll notable changes to this project will be ' +
                        'documented in this file.' +
                        '\n\n### [22.2.2](https://www.github.com/fake/repo/compare' +
                        '/pkgBB-v22.2.1...pkgBB-v22.2.2) (1983-10-10)' +
                        '\n\n\n### Bug Fixes' +
                        '\n\n* We fixed a bug\n',
                ],
                [
                    'Cargo.lock',
                    `
          # This file is automatically @generated by Cargo.
          # It is not intended for manual editing.
          [[package]]
          name = "pkgA"
          version = "1.1.1"
          dependencies = []

          [[package]]
          name = "pkgB"
          version = "2.2.2"
          dependencies = [
              "pkgA", "someExternal"
          ]

          [[package]]
          name = "pkgAA"
          version = "11.1.1"
          dependencies = ["foo"]

          [[package]]
          name = "pkgBB"
          version = "22.2.2"
          dependencies = ["pkgAA", "someExternal"]

          # omitted: externals (not relevant for tests)
          `,
                ],
            ]);
            // pkgA had a patch bump and pkgAA had a minor bump from
            // manifest.runReleasers()
            const newManifestVersions = new Map([
                ['packages/pkgA', '1.1.2'],
                ['packages/pkgAA', '11.2.0'],
            ]);
            const pkgAAData = {
                config: {
                    releaseType: 'rust',
                    packageName: 'pkgAA',
                    path: 'packages/pkgAA',
                },
                prData: {
                    version: '11.2.0',
                    changes: new Map([
                        [
                            'packages/pkgAA/Cargo.toml',
                            {
                                content: `
                [package]
                name = "pkgAA"
                version = "11.2.0"

                [dependencies]
                foo = "4.1.7"
                `,
                                mode: '100644',
                            },
                        ],
                        [
                            'packages/pkgAA/CHANGELOG.md',
                            {
                                content: '### [11.2.0](https://www.github.com/fake/repo/compare' +
                                    '/pkgAA-v11.1.1...pkgAA-v11.2.0) (1983-10-10)' +
                                    '\n\n\n### Features' +
                                    '\n\n* We added a feature',
                                mode: '100644',
                            },
                        ],
                    ]),
                },
            };
            const pkgsWithPRData = [pkgAData, pkgAAData];
            const logs = [];
            const checkpoint = (msg, type) => logs.push([msg, type]);
            const cargoWS = new cargo_workspace_1.default(github, config, 'cargo-workspace', checkpoint);
            const [actualManifest, actualChanges] = await cargoWS.run(newManifestVersions, pkgsWithPRData);
            mock.verify();
            chai_1.expect([...actualManifest]).to.eql([
                ['packages/pkgA', '1.1.2'],
                ['packages/pkgAA', '11.2.0'],
                ['packages/pkgB', '2.2.3'],
                ['packages/pkgBB', '22.2.3'],
            ]);
            const snapPrefix = this.test.fullTitle();
            snapshot(snapPrefix + ' logs', logs);
            snapshot(snapPrefix + ' changes', stringifyActual(actualChanges));
        });
    });
});
//# sourceMappingURL=cargo-workspace.js.map