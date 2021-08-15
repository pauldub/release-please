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
const chai_1 = require("chai");
const nock = require("nock");
nock.disableNetConnect();
const conventional_commits_1 = require("../src/conventional-commits");
const github_1 = require("../src/github");
const release_pr_1 = require("../src/release-pr");
const sinon = require("sinon");
const node_1 = require("../src/releasers/node");
const fs_1 = require("fs");
const path_1 = require("path");
const sandbox = sinon.createSandbox();
const fixturesPath = './test/fixtures';
class TestableReleasePR extends node_1.Node {
    async coerceReleaseCandidate(cc, latestTag, preRelease = false) {
        return super.coerceReleaseCandidate(cc, latestTag, preRelease);
    }
    async openPR(options) {
        this.gh = {
            openPR: async (opts) => {
                this.openPROpts = opts;
                return 0;
            },
            getFileContents: async (_file) => {
                return { sha: 'abc123', content: '{}', parsedContent: '{}' };
            },
        };
        return super.openPR(options);
    }
}
mocha_1.describe('Release-PR', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('coerceReleaseCandidate', () => {
        mocha_1.it('suggests next version #, based on commit types', async () => {
            const rp = new TestableReleasePR({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'nodejs' }),
            });
            const cc = new conventional_commits_1.ConventionalCommits({
                commits: [
                    {
                        sha: 'abc123',
                        message: 'fix: addresses issues with library',
                        files: [],
                    },
                    {
                        sha: 'abc124',
                        message: 'feat!: adds a slick new feature',
                        files: [],
                    },
                    {
                        sha: 'abc125',
                        message: 'fix: another fix',
                        files: [],
                    },
                ],
                owner: 'googleapis',
                repository: 'nodejs',
            });
            const candidate = await rp.coerceReleaseCandidate(cc, {
                name: 'tag',
                sha: 'abc123',
                version: '2.0.0',
            });
            chai_1.expect(candidate.version).to.equal('3.0.0');
        });
        mocha_1.it('reads release-as footer, and allows it to override recommended bump', async () => {
            const rp = new TestableReleasePR({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'nodejs' }),
            });
            const cc = new conventional_commits_1.ConventionalCommits({
                commits: [
                    {
                        sha: 'abc123',
                        message: 'fix: addresses issues with library',
                        files: [],
                    },
                    {
                        sha: 'abc124',
                        message: 'feat: adds a slick new feature\nRelease-As: 2.0.0',
                        files: [],
                    },
                    {
                        sha: 'abc125',
                        message: 'fix: another fix\n\nRelease-As: 3.0.0',
                        files: [],
                    },
                ],
                owner: 'googleapis',
                repository: 'nodejs',
            });
            const candidate = await rp.coerceReleaseCandidate(cc);
            chai_1.expect(candidate.version).to.equal('2.0.0');
        });
        mocha_1.it('it handles additional content after release-as: footer', async () => {
            const rp = new TestableReleasePR({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'nodejs' }),
            });
            const cc = new conventional_commits_1.ConventionalCommits({
                commits: [
                    {
                        sha: 'abc123',
                        message: 'fix: addresses issues with library',
                        files: [],
                    },
                    {
                        sha: 'abc124',
                        message: 'feat: adds a slick new feature\nRelease-As: 2.0.0\r\nSecond Footer: hello',
                        files: [],
                    },
                    {
                        sha: 'abc125',
                        message: 'fix: another fix\n\nRelease-As: 3.0.0',
                        files: [],
                    },
                ],
                owner: 'googleapis',
                repository: 'nodejs',
            });
            const candidate = await rp.coerceReleaseCandidate(cc);
            chai_1.expect(candidate.version).to.equal('2.0.0');
        });
        mocha_1.describe('preRelease', () => {
            mocha_1.it('increments a prerelease appropriately', async () => {
                const rp = new TestableReleasePR({
                    github: new github_1.GitHub({ owner: 'googleapis', repo: 'nodejs' }),
                });
                const cc = new conventional_commits_1.ConventionalCommits({
                    commits: [],
                    owner: 'googleapis',
                    repository: 'nodejs',
                });
                const candidate = await rp.coerceReleaseCandidate(cc, {
                    name: 'tag',
                    sha: 'abc123',
                    version: '1.0.0-alpha9',
                }, true);
                chai_1.expect(candidate.version).to.equal('1.0.0-alpha10');
            });
            mocha_1.it('handles pre-release when there is no suffix', async () => {
                const rp = new TestableReleasePR({
                    github: new github_1.GitHub({ owner: 'googleapis', repo: 'nodejs' }),
                });
                const cc = new conventional_commits_1.ConventionalCommits({
                    commits: [],
                    owner: 'googleapis',
                    repository: 'nodejs',
                });
                const candidate = await rp.coerceReleaseCandidate(cc, {
                    name: 'tag',
                    sha: 'abc123',
                    version: '1.0.0',
                }, true);
                chai_1.expect(candidate.version).to.equal('1.0.0-alpha1');
            });
        });
    });
    mocha_1.describe('openPR', () => {
        mocha_1.it('drops npm style @org/ prefix', async () => {
            var _a;
            const rp = new TestableReleasePR({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'nodejs' }),
                packageName: '@google-cloud/nodejs',
            });
            await rp.openPR({
                sha: 'abc123',
                changelogEntry: 'changelog',
                updates: [],
                version: '1.3.0',
                includePackageName: true,
            });
            chai_1.expect((_a = rp.openPROpts) === null || _a === void 0 ? void 0 : _a.branch).to.equal('release-nodejs-v1.3.0');
        });
    });
    mocha_1.describe('getPackageName', () => {
        const github = new github_1.GitHub({ owner: 'googleapis', repo: 'node-test-repo' });
        for (const name of ['foo', '@foo/bar', '@foo-bar/baz']) {
            mocha_1.it(`base implementation: ${name}`, async () => {
                const releasePR = new release_pr_1.ReleasePR({ github, packageName: name });
                const packageName = await releasePR.getPackageName();
                chai_1.expect(packageName.name).to.equal(name);
                chai_1.expect(packageName.getComponent()).to.equal(name);
            });
        }
    });
    mocha_1.describe('latestTag', () => {
        let req;
        let releasePR;
        mocha_1.beforeEach(() => {
            req = nock('https://api.github.com/');
            releasePR = new release_pr_1.ReleasePR({
                github: new github_1.GitHub({ owner: 'fake', repo: 'fake' }),
            });
            sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
        });
        mocha_1.it('handles monorepo composite branch names properly', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag-monorepo.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag('complex-package_name-v1-');
            chai_1.expect(latestTag.version).to.equal('1.1.0');
            req.done();
        });
        mocha_1.it('does not return monorepo composite tag, if no prefix provided', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag-monorepo.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.3.0');
            req.done();
        });
        mocha_1.it('returns the latest tag on the main branch, based on PR date', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.3.0');
            req.done();
        });
        mocha_1.it('returns the latest tag on a sub branch, based on PR date', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag-alternate-branch.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            // We need a special one here to set an alternate branch.
            releasePR = new release_pr_1.ReleasePR({
                github: new github_1.GitHub({
                    owner: 'fake',
                    repo: 'fake',
                    defaultBranch: 'legacy-8',
                }),
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.3.0');
            req.done();
        });
        mocha_1.it('does not return pre-releases as latest tag', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.3.0');
            req.done();
        });
        mocha_1.it('returns pre-releases on the main branch as latest, when preRelease is true', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag(undefined, true);
            chai_1.expect(latestTag.version).to.equal('2.0.0-rc1');
            req.done();
        });
        mocha_1.it('returns pre-releases on a sub branch as latest, when preRelease is true', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag-alternate-branch.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            // We need a special one here to set an alternate branch.
            releasePR = new release_pr_1.ReleasePR({
                github: new github_1.GitHub({
                    owner: 'fake',
                    repo: 'fake',
                    defaultBranch: 'prerelease',
                }),
            });
            const latestTag = await releasePR.latestTag(undefined, true);
            chai_1.expect(latestTag.version).to.equal('2.0.0-rc1');
            req.done();
        });
        mocha_1.it('ignores associatedPullRequests that do not match the commit sha', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag-extra-pull-requests.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag();
            chai_1.expect(latestTag.version).to.equal('1.3.0');
            req.done();
        });
        mocha_1.it('- prefix is optional for pre-release suffixes', async () => {
            const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'latest-tag-python.json'), 'utf8'));
            req.post('/graphql').reply(200, {
                data: graphql,
            });
            const latestTag = await releasePR.latestTag(undefined, true);
            chai_1.expect(latestTag.version).to.equal('2.0.0-b2');
            req.done();
        });
    });
    mocha_1.it('returns early if outstanding release is found', async () => {
        const releasePR = new release_pr_1.ReleasePR({
            github: new github_1.GitHub({
                owner: 'fake',
                repo: 'fake',
                defaultBranch: 'legacy-8',
            }),
        });
        const findMergedReleasePRStub = sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .resolves({
            sha: 'abc123',
            number: 33,
            baseRefName: 'main',
            headRefName: 'foo',
            labels: [],
            title: 'chore: release',
            body: 'release',
        });
        await releasePR.run();
        // It's important to assert that we only iterate over a reasonable
        // number of commits looking for outstanding release PRs, if this
        // step is allowed to run to completion it may timeout on large
        // repos with no open PRs:
        sandbox.assert.calledWith(findMergedReleasePRStub, sandbox.match(['autorelease: pending']), sandbox.match.any, sinon.match.truthy, sandbox.match(100));
    });
});
//# sourceMappingURL=release-pr.js.map