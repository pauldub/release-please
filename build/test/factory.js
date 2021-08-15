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
const factory_1 = require("../src/factory");
const sinon = require("sinon");
const chai_1 = require("chai");
const sandbox = sinon.createSandbox();
mocha_1.describe('factory', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('gitHubInstance', () => {
        const owner = 'google';
        const repo = 'cloud';
        const repoUrls = [
            `${owner}/${repo}`,
            `https://github.com/${owner}/${repo}.git`,
            `git@github.com:${owner}/${repo}`,
        ];
        mocha_1.it('returns a default configured GitHub instance', async () => {
            const gh = factory_1.factory.gitHubInstance({ repoUrl });
            chai_1.expect(gh.owner).to.equal(owner);
            chai_1.expect(gh.repo).to.equal(repo);
            chai_1.expect(gh.fork).to.be.false;
            chai_1.expect(gh.apiUrl).to.equal('https://api.github.com');
            chai_1.expect(gh.token).to.be.undefined;
            sandbox.stub(gh, 'getRepositoryDefaultBranch').resolves('main');
            const branch = await gh.getDefaultBranch();
            chai_1.expect(branch).to.equal('main');
        });
        mocha_1.it('returns a fully configured GitHub instance', async () => {
            const gh = factory_1.factory.gitHubInstance({
                repoUrl,
                fork: true,
                token: 'my-token',
                apiUrl: 'my-api-url',
                defaultBranch: '1.x',
            });
            chai_1.expect(gh.owner).to.equal(owner);
            chai_1.expect(gh.repo).to.equal(repo);
            chai_1.expect(gh.fork).to.be.true;
            chai_1.expect(gh.apiUrl).to.equal('my-api-url');
            chai_1.expect(gh.token).to.equal('my-token');
            sandbox.mock(gh).expects('getRepositoryDefaultBranch').never();
            const branch = await gh.getDefaultBranch();
            chai_1.expect(branch).to.equal('1.x');
        });
        for (const repoUrl of repoUrls) {
            mocha_1.it(`parses github repo url: ${repoUrl}`, () => {
                const gh = factory_1.factory.gitHubInstance({ repoUrl });
                chai_1.expect(gh.owner).to.equal(owner);
                chai_1.expect(gh.repo).to.equal(repo);
            });
        }
        const repoUrl = repoUrls[0];
        mocha_1.it('prefers configured defaultBranch', async () => {
            const gh = factory_1.factory.gitHubInstance({ repoUrl, defaultBranch: '1.x' });
            const branch = await gh.getDefaultBranch();
            chai_1.expect(branch).to.equal('1.x');
        });
        mocha_1.it('falls back to github defaultBranch', async () => {
            const gh = factory_1.factory.gitHubInstance({ repoUrl });
            const stub = sandbox.stub(gh.octokit.repos, 'get');
            stub
                .withArgs({
                repo,
                owner,
                headers: sinon.match.any,
            })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .resolves({ data: { default_branch: 'main' } });
            stub.throwsArg(0);
            const branch = await gh.getDefaultBranch();
            chai_1.expect(branch).to.equal('main');
        });
    });
    mocha_1.describe('releasePR', () => {
        mocha_1.it('returns a default configured ReleasePR instance', async () => {
            const releasePR = factory_1.factory.releasePR({
                repoUrl: 'googleapis/ruby-test-repo',
            });
            chai_1.expect(releasePR.gh.fork).to.be.false;
            chai_1.expect(releasePR.gh.token).to.be.undefined;
            chai_1.expect(releasePR.gh.owner).to.equal('googleapis');
            chai_1.expect(releasePR.gh.repo).to.equal('ruby-test-repo');
            chai_1.expect(releasePR.gh.apiUrl).to.equal('https://api.github.com');
            chai_1.expect(releasePR.constructor.name).to.equal('ReleasePR');
            chai_1.expect(releasePR.labels).to.eql(['autorelease: pending']);
            chai_1.expect(releasePR.bumpMinorPreMajor).to.be.false;
            chai_1.expect(releasePR.path).to.be.undefined;
            chai_1.expect(releasePR.monorepoTags).to.be.false;
            chai_1.expect(releasePR.releaseAs).to.be.undefined;
            chai_1.expect(releasePR.snapshot).to.be.undefined;
            chai_1.expect(releasePR.lastPackageVersion).to.be.undefined;
            chai_1.expect(releasePR.changelogSections).to.be.undefined;
            chai_1.expect(releasePR.changelogPath).to.equal('CHANGELOG.md');
            const packageName = await releasePR.getPackageName();
            chai_1.expect(packageName.name).to.equal('');
            chai_1.expect(packageName.getComponent()).to.equal('');
        });
        mocha_1.it('returns a fully configured ReleasePR instance', async () => {
            const releasePR = factory_1.factory.releasePR({
                repoUrl: 'googleapis/ruby-test-repo',
                fork: true,
                token: 'some-token',
                apiUrl: 'https://some.api.com',
                packageName: 'ruby-test-repo',
                releaseType: 'ruby',
                label: 'foo,bar',
                path: 'some/path',
                bumpMinorPreMajor: true,
                releaseAs: '1.2.3',
                snapshot: true,
                monorepoTags: true,
                changelogSections: [{ type: 'feat', section: 'Features' }],
                changelogPath: 'HISTORY.md',
                lastPackageVersion: '0.0.1',
                versionFile: 'some/ruby/version.rb',
            });
            chai_1.expect(releasePR.gh.fork).to.be.true;
            chai_1.expect(releasePR.gh.token).to.equal('some-token');
            chai_1.expect(releasePR.gh.owner).to.equal('googleapis');
            chai_1.expect(releasePR.gh.repo).to.equal('ruby-test-repo');
            chai_1.expect(releasePR.gh.apiUrl).to.equal('https://some.api.com');
            chai_1.expect(releasePR.constructor.name).to.equal('Ruby');
            chai_1.expect(releasePR.labels).to.eql(['foo', 'bar']);
            chai_1.expect(releasePR.bumpMinorPreMajor).to.be.true;
            chai_1.expect(releasePR.path).to.equal('some/path');
            chai_1.expect(releasePR.monorepoTags).to.be.true;
            chai_1.expect(releasePR.releaseAs).to.equal('1.2.3');
            chai_1.expect(releasePR.snapshot).to.be.true;
            chai_1.expect(releasePR.lastPackageVersion).to.equal('0.0.1');
            chai_1.expect(releasePR.versionFile).to.equal('some/ruby/version.rb');
            chai_1.expect(releasePR.changelogSections).to.eql([
                { type: 'feat', section: 'Features' },
            ]);
            chai_1.expect(releasePR.changelogPath).to.equal('HISTORY.md');
            const packageName = await releasePR.getPackageName();
            chai_1.expect(packageName.name).to.equal('ruby-test-repo');
            chai_1.expect(packageName.getComponent()).to.equal('ruby-test-repo');
        });
        mocha_1.it('throws an error on invalid release type', () => {
            chai_1.expect(() => factory_1.factory.releasePR({
                repoUrl: 'googleapis/simple-test-repo',
                packageName: 'simple-test-repo',
                apiUrl: 'https://api.github.com',
                releaseType: 'unknown',
            })).to.throw();
        });
    });
    mocha_1.describe('releasePRClass', () => {
        mocha_1.it('returns a releaser class', () => {
            const releaseClass = factory_1.factory.releasePRClass('ruby');
            chai_1.expect(releaseClass.name).to.equal('Ruby');
        });
        mocha_1.it('returns base class when no releaseType', () => {
            const releaseClass = factory_1.factory.releasePRClass();
            chai_1.expect(releaseClass.name).to.equal('ReleasePR');
        });
        mocha_1.it('returns base class when unrecognized releaseType', () => {
            const releaseClass = factory_1.factory.releasePRClass();
            chai_1.expect(releaseClass.name).to.equal('ReleasePR');
        });
    });
    mocha_1.describe('githubRelease', () => {
        mocha_1.it('returns a default configured GitHubRelease instance', async () => {
            const ghr = factory_1.factory.githubRelease({
                repoUrl: 'googleapis/simple-test-repo',
            });
            chai_1.expect(ghr.constructor.name).to.equal('GitHubRelease');
            chai_1.expect(ghr.draft).to.be.false;
            chai_1.expect(ghr.gh.owner).to.equal('googleapis');
            chai_1.expect(ghr.gh.repo).to.equal('simple-test-repo');
            chai_1.expect(ghr.gh.token).to.be.undefined;
            chai_1.expect(ghr.gh.apiUrl).to.equal('https://api.github.com');
            chai_1.expect(ghr.gh.fork).to.be.false;
            chai_1.expect(ghr.releasePR.constructor.name).to.equal('ReleasePR');
            chai_1.expect(ghr.releasePR.labels).to.eql(['autorelease: pending']);
            chai_1.expect(ghr.releasePR.path).to.be.undefined;
            chai_1.expect(ghr.releasePR.releaseAs).to.be.undefined;
            chai_1.expect(ghr.releasePR.bumpMinorPreMajor).to.be.false;
            chai_1.expect(ghr.releasePR.monorepoTags).to.be.false;
            chai_1.expect(ghr.releasePR.changelogSections).to.be.undefined;
            chai_1.expect(ghr.releasePR.changelogPath).to.equal('CHANGELOG.md');
            chai_1.expect(ghr.releasePR.lastPackageVersion).to.be.undefined;
            const packageName = await ghr.releasePR.getPackageName();
            chai_1.expect(packageName.name).to.equal('');
            chai_1.expect(packageName.getComponent()).to.equal('');
        });
        mocha_1.it('returns a fully configured GitHubRelease instance', async () => {
            const ghr = factory_1.factory.githubRelease({
                repoUrl: 'googleapis/ruby-test-repo',
                defaultBranch: '1.x',
                fork: true,
                token: 'some-token',
                apiUrl: 'https://some.api.com',
                releaseType: 'ruby',
                label: 'foo,bar',
                path: 'some/path',
                packageName: 'ruby-test-repo',
                bumpMinorPreMajor: true,
                releaseAs: '1.2.3',
                snapshot: true,
                monorepoTags: true,
                changelogSections: [{ type: 'feat', section: 'Features' }],
                changelogPath: 'HISTORY.md',
                lastPackageVersion: '0.0.1',
                versionFile: 'some/ruby/version.rb',
                draft: true,
            });
            chai_1.expect(ghr.constructor.name).to.equal('GitHubRelease');
            chai_1.expect(ghr.draft).to.be.true;
            chai_1.expect(ghr.gh.owner).to.equal('googleapis');
            chai_1.expect(ghr.gh.repo).to.equal('ruby-test-repo');
            chai_1.expect(ghr.gh.token).to.equal('some-token');
            chai_1.expect(ghr.gh.apiUrl).to.equal('https://some.api.com');
            chai_1.expect(ghr.gh.fork).to.be.true;
            const branch = await ghr.gh.getDefaultBranch();
            chai_1.expect(branch).to.equal('1.x');
            chai_1.expect(ghr.releasePR.constructor.name).to.equal('Ruby');
            chai_1.expect(ghr.releasePR.labels).to.eql(['foo', 'bar']);
            chai_1.expect(ghr.releasePR.path).to.equal('some/path');
            chai_1.expect(ghr.releasePR.releaseAs).to.equal('1.2.3');
            chai_1.expect(ghr.releasePR.bumpMinorPreMajor).to.be.true;
            chai_1.expect(ghr.releasePR.monorepoTags).to.be.true;
            chai_1.expect(ghr.releasePR.changelogSections).to.eql([
                { type: 'feat', section: 'Features' },
            ]);
            chai_1.expect(ghr.releasePR.changelogPath).to.equal('HISTORY.md');
            chai_1.expect(ghr.releasePR.lastPackageVersion).to.equal('0.0.1');
            chai_1.expect(ghr.releasePR.versionFile).to.equal('some/ruby/version.rb');
            const packageName = await ghr.releasePR.getPackageName();
            chai_1.expect(packageName.name).to.equal('ruby-test-repo');
            chai_1.expect(packageName.getComponent()).to.equal('ruby-test-repo');
        });
    });
    mocha_1.describe('manifest', () => {
        mocha_1.it('returns a default configured Manifest class', () => {
            const m = factory_1.factory.manifest({ repoUrl: 'googleapis/simple-test-repo' });
            chai_1.expect(m.constructor.name).to.equal('Manifest');
            chai_1.expect(m.gh.owner).to.equal('googleapis');
            chai_1.expect(m.gh.repo).to.equal('simple-test-repo');
            chai_1.expect(m.gh.token).to.be.undefined;
            chai_1.expect(m.gh.apiUrl).to.equal('https://api.github.com');
            chai_1.expect(m.gh.fork).to.be.false;
            chai_1.expect(m.configFileName).to.equal('release-please-config.json');
            chai_1.expect(m.manifestFileName).to.equal('.release-please-manifest.json');
        });
        mocha_1.it('returns a fully configured Manifest class', async () => {
            const m = factory_1.factory.manifest({
                repoUrl: 'googleapis/ruby-test-repo',
                defaultBranch: '1.x',
                fork: true,
                token: 'some-token',
                apiUrl: 'https://some.api.com',
                configFile: 'foo-config.json',
                manifestFile: '.foo-manifest.json',
            });
            chai_1.expect(m.constructor.name).to.equal('Manifest');
            chai_1.expect(m.gh.owner).to.equal('googleapis');
            chai_1.expect(m.gh.repo).to.equal('ruby-test-repo');
            chai_1.expect(m.gh.token).to.equal('some-token');
            chai_1.expect(m.gh.apiUrl).to.equal('https://some.api.com');
            chai_1.expect(m.gh.fork).to.be.true;
            const branch = await m.gh.getDefaultBranch();
            chai_1.expect(branch).to.equal('1.x');
            chai_1.expect(m.configFileName).to.equal('foo-config.json');
            chai_1.expect(m.manifestFileName).to.equal('.foo-manifest.json');
        });
    });
    mocha_1.describe('runCommand', () => {
        mocha_1.it('errors on bad command', async () => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            chai_1.expect(() => factory_1.factory.runCommand('foobar', { bar: 'baz' })).to.throw('Invalid command(foobar) with options({"bar":"baz"})');
        });
    });
    mocha_1.describe('call', () => {
        mocha_1.it('calls ReleasePR.run', async () => {
            const instance = factory_1.factory.releasePR({
                repoUrl: 'googleapis/simple-test-repo',
                releaseType: 'simple',
            });
            sandbox.stub(instance, 'run').resolves(47);
            chai_1.expect(await factory_1.factory.call(instance, 'run')).to.equal(47);
        });
        mocha_1.it('errors with bad method on ReleasePR', async () => {
            const instance = factory_1.factory.releasePR({
                repoUrl: 'googleapis/simple-test-repo',
                releaseType: 'simple',
            });
            chai_1.expect(() => factory_1.factory.call(instance, 'foo')).to.throw('No such method(foo) on Simple');
        });
        mocha_1.it('calls a GitHubRelease instance', async () => {
            const instance = factory_1.factory.githubRelease({
                repoUrl: 'googleapis/simple-test-repo',
                releaseType: 'simple',
            });
            const ghRelease = {
                major: 1,
                minor: 2,
                patch: 3,
                version: '1.2.3',
                sha: 'abc123',
                html_url: 'https://release.url',
                upload_url: 'https://upload.url/',
                name: 'v1.2.3',
                tag_name: 'v1.2.3',
                pr: 1,
                draft: false,
                body: '\n* entry',
            };
            sandbox.stub(instance, 'run').resolves(ghRelease);
            chai_1.expect(await factory_1.factory.call(instance, 'run')).to.eql(ghRelease);
        });
        mocha_1.it('errors with bad method on GitHubRelease', async () => {
            const instance = factory_1.factory.githubRelease({
                repoUrl: 'googleapis/simple-test-repo',
                releaseType: 'simple',
            });
            chai_1.expect(() => factory_1.factory.call(instance, 'foo')).to.throw('No such method(foo) on GitHubRelease');
        });
        mocha_1.it('calls a Manifest instance', async () => {
            const instance = factory_1.factory.manifest({
                repoUrl: 'googleapis/simple-test-repo',
            });
            sandbox.stub(instance, 'pullRequest').resolves(32);
            chai_1.expect(await factory_1.factory.call(instance, 'pullRequest')).to.eql(32);
        });
        mocha_1.it('errors with bad method on Manifest', async () => {
            const instance = factory_1.factory.manifest({
                repoUrl: 'googleapis/simple-test-repo',
            });
            chai_1.expect(() => factory_1.factory.call(instance, 'foo')).to.throw('No such method(foo) on Manifest');
        });
        mocha_1.it('errors with bad method on unknown', async () => {
            chai_1.expect(() => factory_1.factory.call({ foo: () => 'in foo' }, 'foo')).to.throw('Unknown instance.');
        });
    });
});
//# sourceMappingURL=factory.js.map