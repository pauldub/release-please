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
const terraform_module_1 = require("../../src/releasers/terraform-module");
const fs_1 = require("fs");
const path_1 = require("path");
const helpers_1 = require("../helpers");
const nock = require("nock");
const sinon = require("sinon");
const github_1 = require("../../src/github");
nock.disableNetConnect();
const sandbox = sinon.createSandbox();
const fixturesPath = './test/releasers/fixtures/terraform';
const releasePR = new terraform_module_1.TerraformModule({
    github: new github_1.GitHub({ owner: 'googleapis', repo: 'terraform-test-repo' }),
});
mocha_1.describe('terraform-module', () => {
    const tests = [
        {
            // simple-module with module versions defined
            name: 'simple-module',
            findVersionFiles: ['versions.tf'],
            findTemplatedVersionFiles: ['versions.tf.tmpl'],
            findReadmeFiles: ['readme.md'],
            readFilePaths: [
                'simple-module/readme.md',
                'simple-module/versions.tf',
                'simple-module/versions.tf.tmpl',
            ],
            expectedVersion: '12.1.0',
        },
        {
            // module-submodule with submodules
            // sub-module-with-version has module versions defined
            // sub-module-missing-versions has no versions.tf
            name: 'module-submodule',
            findVersionFiles: [
                'versions.tf',
                'modules/sub-module-with-version/versions.tf',
            ],
            findTemplatedVersionFiles: [],
            findReadmeFiles: [
                'README.md',
                'modules/sub-module-with-version/readme.md',
                'modules/sub-module-missing-versions/README.md',
            ],
            readFilePaths: [
                'module-submodule/README.md',
                'module-submodule/modules/sub-module-with-version/readme.md',
                'module-submodule/modules/sub-module-missing-versions/README.md',
                'module-submodule/versions.tf',
                'module-submodule/modules/sub-module-with-version/versions.tf',
            ],
            expectedVersion: '2.1.0',
        },
        {
            // module-no-versions with no module versions defined in versions.tf
            name: 'module-no-versions',
            findVersionFiles: [],
            findTemplatedVersionFiles: [],
            findReadmeFiles: ['module-no-versions/README.MD'],
            readFilePaths: ['module-no-versions/README.MD'],
            expectedVersion: '2.1.0',
        },
    ];
    mocha_1.beforeEach(() => {
        // Indicates that there are no PRs currently waiting to be released:
        sandbox
            .stub(releasePR.gh, 'findMergedReleasePR')
            .returns(Promise.resolve(undefined));
        // Commits, used to build CHANGELOG, and propose next version bump:
        sandbox
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .stub(releasePR, 'commits')
            .returns(Promise.resolve(helpers_1.readPOJO('commits-fix')));
        // See if there are any release PRs already open, we do this as
        // we consider opening a new release-pr:
        sandbox
            .stub(releasePR.gh, 'findOpenReleasePRs')
            .returns(Promise.resolve([]));
        // Lookup the default branch name:
        sandbox.stub(releasePR.gh, 'getDefaultBranch').resolves('main');
    });
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('run', () => {
        tests.forEach(test => {
            mocha_1.it(`creates a release PR for ${test.name}`, async function () {
                sandbox
                    .stub(releasePR.gh, 'findFilesByFilename')
                    .onFirstCall()
                    .returns(Promise.resolve(test.findReadmeFiles))
                    .onSecondCall()
                    .returns(Promise.resolve(test.findVersionFiles))
                    .onThirdCall()
                    .returns(Promise.resolve(test.findTemplatedVersionFiles));
                // Return latest tag used to determine next version #:
                sandbox.stub(releasePR, 'latestTag').returns(Promise.resolve({
                    sha: 'da6e52d956c1e35d19e75e0f2fdba439739ba364',
                    name: `v${test.expectedVersion}`,
                    version: test.expectedVersion,
                }));
                // Fetch files from GitHub, in prep to update with code-suggester:
                const getFileContentsStub = sandbox.stub(releasePR.gh, 'getFileContentsOnBranch');
                // CHANGELOG is not found, and will be created:
                getFileContentsStub
                    .onCall(0)
                    .rejects(Object.assign(Error('not found'), { status: 404 }));
                test.readFilePaths.forEach((readFilePath, count) => {
                    const fileContent = fs_1.readFileSync(path_1.resolve(fixturesPath, readFilePath), 'utf8').replace(/\r\n/g, '\n');
                    getFileContentsStub.onCall(count + 1).resolves({
                        sha: 'abc123',
                        content: Buffer.from(fileContent, 'utf8').toString('base64'),
                        parsedContent: fileContent,
                    });
                });
                // Call to add autorelease: pending label:
                sandbox.stub(releasePR.gh, 'addLabels');
                helpers_1.stubSuggesterWithSnapshot(sandbox, this.test.fullTitle());
                await releasePR.run();
            });
        });
    });
});
//# sourceMappingURL=terraform-module.js.map