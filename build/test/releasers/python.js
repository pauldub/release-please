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
const chai_1 = require("chai");
const github_1 = require("../../src/github");
const python_1 = require("../../src/releasers/python");
const snapshot = require("snap-shot-it");
const sinon = require("sinon");
const utils_1 = require("./utils");
const helpers_1 = require("../helpers");
const changelog_1 = require("../../src/updaters/changelog");
const setup_cfg_1 = require("../../src/updaters/python/setup-cfg");
const setup_py_1 = require("../../src/updaters/python/setup-py");
const python_file_with_version_1 = require("../../src/updaters/python/python-file-with-version");
const sandbox = sinon.createSandbox();
function stubFilesToUpdate(github, files) {
    utils_1.stubFilesFromFixtures({
        fixturePath: './test/updaters/fixtures',
        sandbox,
        github,
        files,
    });
}
const LATEST_TAG = {
    name: 'v0.123.4',
    sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
    version: '0.123.4',
};
const COMMITS = [
    helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
    helpers_1.buildMockCommit('fix(deps): update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
    helpers_1.buildMockCommit('chore: update common templates'),
];
let latestTagStub = sinon.spy();
function stubGithub(releasePR, versionFiles = [], commits = COMMITS, latestTag = LATEST_TAG, stubGetFileContents = true) {
    if (stubGetFileContents) {
        sandbox.stub(releasePR.gh, 'getFileContents').rejects();
    }
    sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('master');
    // No open release PRs, so create a new release PR
    sandbox.stub(releasePR.gh, 'findOpenReleasePRs').returns(Promise.resolve([]));
    sandbox
        .stub(releasePR.gh, 'findMergedReleasePR')
        .returns(Promise.resolve(undefined));
    latestTagStub = sandbox.stub(releasePR, 'latestTag').resolves(latestTag);
    sandbox.stub(releasePR.gh, 'commitsSinceSha').resolves(commits);
    sandbox.stub(releasePR.gh, 'addLabels');
    sandbox.stub(releasePR.gh, 'findFilesByFilename').resolves(versionFiles);
}
mocha_1.describe('Python', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    const pkgName = 'google-cloud-automl';
    mocha_1.describe('getOpenPROptions', () => {
        mocha_1.it('returns release PR changes with defaultInitialVersion', async () => {
            const expectedVersion = '0.1.0';
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
            });
            stubGithub(releasePR, ['src/version.py']);
            // no latestTag to pass to getOpenPROptions (never found a release)
            // releaser should set defaultInitialVersion
            const openPROptions = await releasePR.getOpenPROptions(COMMITS);
            chai_1.expect(openPROptions).to.not.be.undefined;
            chai_1.expect(openPROptions).to.have.property('sha').equal(COMMITS[0].sha);
            chai_1.expect(openPROptions).to.have.property('version').equal(expectedVersion);
            chai_1.expect(openPROptions).to.have.property('includePackageName').to.be.false;
            chai_1.expect(openPROptions).to.have.property('changelogEntry');
            snapshot(helpers_1.dateSafe(openPROptions.changelogEntry));
            const perUpdateChangelog = openPROptions.changelogEntry.substring(0, openPROptions.changelogEntry.length - 5 // no trailing "\n---\n"
            );
            chai_1.expect(openPROptions)
                .to.have.property('updates')
                .to.eql([
                new changelog_1.Changelog({
                    path: 'CHANGELOG.md',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
                new setup_cfg_1.SetupCfg({
                    path: 'setup.cfg',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
                new setup_py_1.SetupPy({
                    path: 'setup.py',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
                new python_file_with_version_1.PythonFileWithVersion({
                    path: 'src/version.py',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
            ]);
        });
        mocha_1.it('returns release PR changes with semver patch bump', async () => {
            const expectedVersion = '0.123.5';
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
            });
            stubGithub(releasePR, ['src/version.py']);
            // found last release (LATEST_TAG) so releaser should semver bump.
            const openPROptions = await releasePR.getOpenPROptions(COMMITS, LATEST_TAG);
            chai_1.expect(openPROptions).to.not.be.undefined;
            chai_1.expect(openPROptions).to.have.property('sha').equal(COMMITS[0].sha);
            chai_1.expect(openPROptions).to.have.property('version').equal(expectedVersion);
            chai_1.expect(openPROptions).to.have.property('includePackageName').to.be.false;
            chai_1.expect(openPROptions).to.have.property('changelogEntry');
            snapshot(helpers_1.dateSafe(openPROptions.changelogEntry));
            const perUpdateChangelog = openPROptions.changelogEntry.substring(0, openPROptions.changelogEntry.length - 5 // no trailing "\n---\n"
            );
            chai_1.expect(openPROptions)
                .to.have.property('updates')
                .to.eql([
                new changelog_1.Changelog({
                    path: 'CHANGELOG.md',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
                new setup_cfg_1.SetupCfg({
                    path: 'setup.cfg',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
                new setup_py_1.SetupPy({
                    path: 'setup.py',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
                new python_file_with_version_1.PythonFileWithVersion({
                    path: 'src/version.py',
                    changelogEntry: perUpdateChangelog,
                    version: expectedVersion,
                    packageName: pkgName,
                }),
            ]);
        });
        mocha_1.it('returns undefined for no CC changes', async () => {
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
            });
            stubGithub(releasePR);
            const openPROptions = await releasePR.getOpenPROptions([helpers_1.buildMockCommit('chore: update common templates')], LATEST_TAG);
            chai_1.expect(openPROptions).to.be.undefined;
        });
    });
    mocha_1.describe('run', () => {
        // normally you'd only have your version in one location
        // e.g. setup.py or setup.cfg or src/version.py, not all 3!
        // just testing the releaser does try to update all 3.
        mocha_1.it('creates a release PR with defaults', async function () {
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR, ['src/version.py'], undefined, undefined, false);
            sandbox.stub(releasePR.gh, 'getFileContents').resolves({
                parsedContent: "[project]\nname = 'project'\nversion = '0.0.1'\n",
                sha: '',
                content: '',
            });
            stubFilesToUpdate(releasePR.gh, [
                'pyproject.toml',
                'project/__init__.py',
                'setup.py',
                'src/version.py',
                'setup.cfg',
            ]);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
        mocha_1.it('creates a release PR relative to a path', async function () {
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
                path: 'projects/python',
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR, ['src/version.py']);
            stubFilesToUpdate(releasePR.gh, [
                'projects/python/setup.py',
                'projects/python/src/version.py',
                'projects/python/setup.cfg',
            ]);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
        mocha_1.it('creates a release PR with custom config', async function () {
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
                path: 'projects/python',
                bumpMinorPreMajor: true,
                monorepoTags: true,
                changelogPath: 'HISTORY.md',
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            const commits = [helpers_1.buildMockCommit('feat!: still no major version')];
            commits.push(...COMMITS);
            const latestTag = { ...LATEST_TAG };
            latestTag.name = pkgName + '-v' + latestTag.version;
            stubGithub(releasePR, ['src/version.py'], commits, latestTag);
            stubFilesToUpdate(releasePR.gh, [
                'projects/python/setup.py',
                'projects/python/src/version.py',
                'projects/python/setup.cfg',
            ]);
            const pr = await releasePR.run();
            assert.strictEqual(pr, 22);
        });
        mocha_1.it('calls latestTag with preRelease set to true', async function () {
            const releasePR = new python_1.Python({
                github: new github_1.GitHub({ owner: 'googleapis', repo: 'py-test-repo' }),
                packageName: pkgName,
            });
            helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
            stubGithub(releasePR, ['src/version.py'], undefined, undefined, false);
            sandbox.stub(releasePR.gh, 'getFileContents').resolves({
                parsedContent: "[project]\nname = 'project'\nversion = '0.0.1'\n",
                sha: '',
                content: '',
            });
            stubFilesToUpdate(releasePR.gh, [
                'pyproject.toml',
                'project/__init__.py',
                'setup.py',
                'src/version.py',
                'setup.cfg',
            ]);
            //  sinon.match.any, true
            await releasePR.run();
            sandbox.assert.calledWith(latestTagStub, sinon.match.any, true);
        });
    });
});
//# sourceMappingURL=python.js.map