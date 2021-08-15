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
const fs_1 = require("fs");
const path = require("path");
const snapshot = require("snap-shot-it");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const commit_split_1 = require("../src/commit-split");
const github_1 = require("../src/github");
const graphql_to_commits_1 = require("../src/graphql-to-commits");
const helpers_1 = require("./helpers");
const fixturesPath = './test/fixtures';
const github = new github_1.GitHub({ owner: 'fake', repo: 'fake' });
mocha_1.describe('CommitSplit', () => {
    mocha_1.it('partitions commits based on path from root directory by default', async () => {
        const graphql = JSON.parse(fs_1.readFileSync(path.resolve(fixturesPath, 'commits-yoshi-php-monorepo.json'), 'utf8'));
        const commits = (await graphql_to_commits_1.graphqlToCommits(github, graphql)).commits;
        const cs = new commit_split_1.CommitSplit();
        snapshot(cs.split(commits));
    });
    // Fixture data and expected results for "partitions commits by ..." tests.
    // Returns a tuple of
    // [
    //   expected CommitSplit.split() output,
    //   input to use for CommitSplitOptions.packagePaths,
    //   input to use for CommitSplit.split()
    // ]
    //
    // includeEmpty == true:
    //   - adds an empty commit to input to use for CommitSplit.split()
    //   - adds that empty commit to each list of expected CommitSplit.split()
    //     output commits
    // usePackagePaths == true:
    //   - populate input to use for CommitSplitOptions.packagePaths
    //   - populate expected CommitSplit.split() keyed by packagePaths entries
    //     and restricted to commits touching child-path files
    // usePackagePaths == false:
    //   - undefined for CommitSplitOptions.packagePaths
    //   - populate expected CommitSplit.split() keyed by top level folders
    const setupPackagePathCommits = (includeEmpty, usePackagePaths) => {
        const pkgsPath = 'packages';
        const fooPath = `${pkgsPath}/foo`;
        const barPath = `${pkgsPath}/bar`;
        const fooBarPath = `${pkgsPath}/foobar`;
        const bazPath = 'python';
        const somePath = 'some';
        const fooCommit = helpers_1.buildMockCommit('fix(foo): fix foo', [
            `${fooPath}/foo.ts`,
        ]);
        const barCommit = helpers_1.buildMockCommit('fix(bar): fix bar', [
            `${barPath}/bar.ts`,
        ]);
        const bazCommit = helpers_1.buildMockCommit('fix(baz): fix baz', [
            `${bazPath}/baz/baz.py`,
        ]);
        const fooBarCommit = helpers_1.buildMockCommit('fix(foobar): fix foobar', [
            `${fooBarPath}/foobar.ts`,
        ]);
        const foobarCommit = helpers_1.buildMockCommit('fix(foo+bar): fix foo+bar', [
            `${fooPath}/foo.ts`,
            `${barPath}/bar.ts`,
        ]);
        const foobarbazCommit = helpers_1.buildMockCommit('fix(foobarbaz): fix foobarbaz', [
            `${fooPath}/foo.ts`,
            `${barPath}/bar.ts`,
            `${bazPath}/baz/baz.py`,
        ]);
        const someCommit = helpers_1.buildMockCommit('fix(some): fix something', [
            `${somePath}/other/file.ts`,
        ]);
        const emptyCommit = helpers_1.buildMockCommit('chore: empty\n\nrelease-packages/foo-as: 1.2.3', []);
        const topLevelFileCommit = helpers_1.buildMockCommit('fix(file): top level file', [
            'topLevelFile.ts',
        ]);
        const commits = [
            fooCommit,
            barCommit,
            bazCommit,
            fooBarCommit,
            foobarCommit,
            foobarbazCommit,
            // should only appear in usePackagePaths == false case
            someCommit,
            emptyCommit,
            // should not appear in any case
            topLevelFileCommit,
        ];
        let packagePaths = [];
        let expectedPerPathCommits = {};
        if (usePackagePaths) {
            // leading/trailing slashs to test path normalization.
            packagePaths = [`/${fooPath}`, barPath, `${bazPath}/`, fooBarPath];
            // Expected output of commit-split with packagePaths
            // someCommit and topLevelFileCommit not present
            expectedPerPathCommits = {
                [fooPath]: [fooCommit, foobarCommit, foobarbazCommit],
                [barPath]: [barCommit, foobarCommit, foobarbazCommit],
                [bazPath]: [bazCommit, foobarbazCommit],
                [fooBarPath]: [fooBarCommit],
            };
        }
        else {
            // Expected output of commit-split with default behavior
            // topLevelFileCommit not present
            expectedPerPathCommits = {
                [pkgsPath]: [
                    fooCommit,
                    barCommit,
                    fooBarCommit,
                    foobarCommit,
                    foobarbazCommit,
                ],
                [bazPath]: [bazCommit, foobarbazCommit],
                [somePath]: [someCommit],
            };
        }
        if (includeEmpty) {
            // Expected that each splits' Commit[] will have the empty commit appended
            for (const commitPath in expectedPerPathCommits) {
                expectedPerPathCommits[commitPath].push(emptyCommit);
            }
        }
        return [expectedPerPathCommits, packagePaths, commits];
    };
    // Test combinations of commit splitting with CommitSplitOptions.includeEmpty
    // and CommitSplitOptions.packagePaths set to the following values
    const emptyVsPaths = [
        // CommitSplitOptions.includeEmpty == true
        // CommitSplitOptions.packagePaths == [
        //   "packages/foo", "packages/bar", "python", "packages/foobar"
        // ]
        [true, true],
        // CommitSplitOptions.includeEmpty == true
        // CommitSplitOptions.packagePaths == undefined
        [true, false],
        // CommitSplitOptions.includeEmpty == undefined
        // CommitSplitOptions.packagePaths == [
        //   "packages/foo", "packages/bar", "python", "packages/foobar"
        // ]
        [false, true],
        // CommitSplitOptions.includeEmpty == undefined
        // CommitSplitOptions.packagePaths == undefined
        [false, false],
    ];
    for (const [includeEmpty, usePackagePaths] of emptyVsPaths) {
        mocha_1.it(`partitions commits by ${usePackagePaths ? 'specified' : 'top level'} paths: includeEmpty(${includeEmpty})`, () => {
            const [expectedSplitCommitSplit, packagePaths, commits] = setupPackagePathCommits(includeEmpty, usePackagePaths);
            const commitSplitOpts = {};
            if (usePackagePaths) {
                commitSplitOpts.packagePaths = packagePaths;
            }
            if (includeEmpty) {
                commitSplitOpts.includeEmpty = includeEmpty;
            }
            const cs = new commit_split_1.CommitSplit(commitSplitOpts);
            const actualSplitCommits = cs.split(commits);
            chai_1.expect(actualSplitCommits).to.eql(expectedSplitCommitSplit);
        });
    }
    // Test valid CommitSplitOptions.packagePaths combinations.
    // Intentionally inconsistent trailing slashes to test path normalization.
    mocha_1.it('validates configured paths on / separator', () => {
        const cs = new commit_split_1.CommitSplit({
            packagePaths: [
                '/two-three',
                'one-two',
                'three/',
                'one',
                'one-two-three',
                'foo/bar',
                'foo/bar-baz',
            ],
        });
        chai_1.expect(cs.packagePaths).to.eql([
            'two-three',
            'one-two',
            'three',
            'one',
            'one-two-three',
            'foo/bar',
            'foo/bar-baz',
        ]);
    });
    mocha_1.it('ignore the "." package', () => {
        const foo = helpers_1.buildMockCommit('fix(foo): fix foo', ['foo/foo.ts']);
        const topLevel = helpers_1.buildMockCommit('fix: fix top level', ['bar.ts']);
        const topAndFoo = helpers_1.buildMockCommit('fix: foo and top level', [
            'foo/foo.ts',
            'bar.ts',
        ]);
        const commits = [foo, topLevel, topAndFoo];
        const cs = new commit_split_1.CommitSplit({ packagePaths: ['foo', '.'] });
        chai_1.expect(cs.packagePaths).to.eql(['foo']);
        const actualSplitCommits = cs.split(commits);
        chai_1.expect(actualSplitCommits).to.eql({ foo: [foo, topAndFoo] });
    });
    mocha_1.it('package path exact start match', () => {
        const foo = helpers_1.buildMockCommit('fix(foo): fix foo', ['foo/foo.ts']);
        const notFoo = helpers_1.buildMockCommit('fix(not-foo): fix not foo', [
            'not/foo/bar.ts',
        ]);
        const commits = [foo, notFoo];
        const cs = new commit_split_1.CommitSplit({ packagePaths: ['foo'] });
        const actualSplitCommits = cs.split(commits);
        chai_1.expect(actualSplitCommits).to.eql({ foo: [foo] });
    });
    // Test invalid CommitSplitOptions.packagePaths combinations.
    // Intentionally inconsistent trailing slashes to test path normalization.
    const invalidPaths = [
        // "foo/bar" overlaps "foo"
        ['foo/bar', 'foo/'],
        // ditto, testing order
        ['foo', 'foo/bar/'],
        // "one/two/three" overlaps "one/two"
        ['one/two/', 'foo/bar/', 'one/two/three'],
    ];
    for (const invalid of invalidPaths) {
        mocha_1.it(`validates configured paths: ${invalid}`, () => {
            chai_1.expect(() => new commit_split_1.CommitSplit({ packagePaths: invalid })).to.throw();
        });
    }
});
//# sourceMappingURL=commit-split.js.map