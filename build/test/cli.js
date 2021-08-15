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
const chai_1 = require("chai");
const factory_1 = require("../src/factory");
const github_release_1 = require("../src/github-release");
const release_pr_1 = require("../src/release-pr");
const mocha_1 = require("mocha");
const sinon = require("sinon");
const release_please_1 = require("../src/bin/release-please");
const chalk = require("chalk");
const manifest_1 = require("../src/manifest");
const snapshot = require("snap-shot-it");
const sandbox = sinon.createSandbox();
let instanceToRun;
let methodCalled;
function callStub(instance, method) {
    instanceToRun = instance;
    methodCalled = method;
    return Promise.resolve(undefined);
}
mocha_1.describe('CLI', () => {
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.describe('handleError', () => {
        mocha_1.it('handles an error', () => {
            const stack = 'bad\nmore\nbad';
            const err = {
                body: { a: 1 },
                status: 404,
                message: 'bad',
                stack,
            };
            const logs = [];
            release_please_1.handleError.logger = {
                error: (msg) => logs.push(msg),
            };
            release_please_1.handleError.yargsArgs = { debug: true, _: ['foobar'], $0: 'mocha?' };
            release_please_1.handleError(err);
            chai_1.expect(logs).to.eql([
                chalk.red('command foobar failed with status 404'),
                '---------',
                stack,
            ]);
        });
        mocha_1.it('needs yargs', () => {
            release_please_1.handleError.yargsArgs = undefined;
            chai_1.expect(() => release_please_1.handleError({ message: '', stack: '' })).to.throw('Set handleError.yargsArgs with a yargs.Arguments instance.');
        });
    });
    mocha_1.describe('manifest', () => {
        for (const [cmd, mtd] of [
            ['manifest-pr', 'pullRequest'],
            ['manifest-release', 'githubRelease'],
        ]) {
            mocha_1.it(`instantiates Manifest for ${cmd}/${mtd}`, () => {
                sandbox.replace(factory_1.factory, 'call', callStub);
                release_please_1.parser.parse(`${cmd} --repo-url=googleapis/release-please-cli`);
                assert.strictEqual(methodCalled, mtd);
                assert.ok(instanceToRun instanceof manifest_1.Manifest);
                assert.strictEqual(instanceToRun.gh.owner, 'googleapis');
                assert.strictEqual(instanceToRun.gh.repo, 'release-please-cli');
                assert.strictEqual(instanceToRun.configFileName, 'release-please-config.json');
                assert.strictEqual(instanceToRun.manifestFileName, '.release-please-manifest.json');
            });
            mocha_1.it(`instantiates Manifest for ${cmd}/${mtd} config/manifest`, () => {
                sandbox.replace(factory_1.factory, 'call', callStub);
                release_please_1.parser.parse(`${cmd} --repo-url=googleapis/release-please-cli ` +
                    '--config-file=foo.json --manifest-file=.bar.json');
                assert.strictEqual(methodCalled, mtd);
                assert.ok(instanceToRun instanceof manifest_1.Manifest);
                assert.strictEqual(instanceToRun.gh.owner, 'googleapis');
                assert.strictEqual(instanceToRun.gh.repo, 'release-please-cli');
                assert.strictEqual(instanceToRun.configFileName, 'foo.json');
                assert.strictEqual(instanceToRun.manifestFileName, '.bar.json');
            });
        }
    });
    mocha_1.describe('release-pr', () => {
        mocha_1.it('instantiates release PR based on command line arguments', () => {
            sandbox.replace(factory_1.factory, 'call', callStub);
            release_please_1.parser.parse('release-pr ' +
                '--repo-url=googleapis/release-please-cli ' +
                '--package-name=cli-package ' +
                "--pull-request-title-pattern='chore${scope}: release${component} ${version}'");
            assert.strictEqual(methodCalled, 'run');
            assert.ok(instanceToRun instanceof release_pr_1.ReleasePR);
            assert.strictEqual(instanceToRun.gh.owner, 'googleapis');
            assert.strictEqual(instanceToRun.gh.repo, 'release-please-cli');
            assert.strictEqual(instanceToRun.packageName, 'cli-package');
            // Defaults to Node.js release type:
            assert.strictEqual(instanceToRun.constructor.name, 'Node');
            assert.strictEqual(instanceToRun.pullRequestTitlePattern, 'chore${scope}: release${component} ${version}');
        });
        mocha_1.it('validates releaseType choices', done => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            const cmd = 'release-pr ' +
                '--release-type=foobar ' +
                '--repo-url=googleapis/release-please-cli ' +
                '--package-name=cli-package';
            const choices = [
                'go',
                'go-yoshi',
                'java-bom',
                'java-lts',
                'java-yoshi',
                'krm-blueprint',
                'node',
                'ocaml',
                'php',
                'php-yoshi',
                'python',
                'ruby',
                'ruby-yoshi',
                'rust',
                'simple',
                'terraform-module',
                'helm',
            ];
            const parseCallback = (err, _argv, _output) => {
                chai_1.expect(err).to.be.an('Error');
                chai_1.expect(err)
                    .to.have.property('message')
                    .to.equal('Invalid values:\n  Argument: release-type, Given: "foobar", ' +
                    'Choices: ' +
                    choices.map(c => `"${c}"`).join(', '));
                done();
            };
            release_please_1.parser.parse(cmd, parseCallback);
        });
    });
    mocha_1.describe('flags', () => {
        mocha_1.it('release-pr flags', done => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            const cmd = 'release-pr --help';
            const parseCallback = (_err, _argv, output) => {
                snapshot(output);
                done();
            };
            release_please_1.parser.parse(cmd, parseCallback);
        });
        mocha_1.it('latest-tag flags', done => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            const cmd = 'latest-tag --help';
            const parseCallback = (_err, _argv, output) => {
                snapshot(output);
                done();
            };
            release_please_1.parser.parse(cmd, parseCallback);
        });
        mocha_1.it('github-release flags', done => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            const cmd = 'github-release --help';
            const parseCallback = (_err, _argv, output) => {
                snapshot(output);
                done();
            };
            release_please_1.parser.parse(cmd, parseCallback);
        });
        mocha_1.it('manifest-pr flags', done => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            const cmd = 'manifest-pr --help';
            const parseCallback = (_err, _argv, output) => {
                snapshot(output);
                done();
            };
            release_please_1.parser.parse(cmd, parseCallback);
        });
        mocha_1.it('manifest-release flags', done => {
            sandbox.stub(factory_1.factory, 'call').resolves(undefined);
            const cmd = 'manifest-release --help';
            const parseCallback = (_err, _argv, output) => {
                snapshot(output);
                done();
            };
            release_please_1.parser.parse(cmd, parseCallback);
        });
    });
    mocha_1.describe('latest-tag', () => {
        mocha_1.it('instantiates release PR for latestTag', () => {
            sandbox.replace(factory_1.factory, 'call', callStub);
            release_please_1.parser.parse('latest-tag --repo-url=googleapis/release-please-cli --package-name=cli-package');
            assert.strictEqual(methodCalled, 'latestTag');
            assert.ok(instanceToRun instanceof release_pr_1.ReleasePR);
            assert.strictEqual(instanceToRun.gh.owner, 'googleapis');
            assert.strictEqual(instanceToRun.gh.repo, 'release-please-cli');
            assert.strictEqual(instanceToRun.packageName, 'cli-package');
            // Defaults to Node.js release type:
            assert.strictEqual(instanceToRun.constructor.name, 'Node');
        });
    });
    mocha_1.describe('github-release', () => {
        mocha_1.it('instantiates a GitHub released based on command line arguments', async () => {
            sandbox.replace(factory_1.factory, 'call', callStub);
            const pkgName = 'cli-package';
            const cmd = 'github-release ' +
                '--repo-url=googleapis/release-please-cli ' +
                '--release-type=node ' +
                `--package-name=${pkgName}`;
            release_please_1.parser.parse(cmd);
            assert.strictEqual(methodCalled, 'run');
            assert.ok(instanceToRun instanceof github_release_1.GitHubRelease);
            assert.strictEqual(instanceToRun.gh.owner, 'googleapis');
            assert.strictEqual(instanceToRun.gh.repo, 'release-please-cli');
            const jsonPkg = `{"name": "${pkgName}"}`;
            sandbox.stub(instanceToRun.releasePR.gh, 'getFileContents').resolves({
                sha: 'abc123',
                content: Buffer.from(jsonPkg, 'utf8').toString('base64'),
                parsedContent: jsonPkg,
            });
            assert.strictEqual((await instanceToRun.releasePR.getPackageName()).name, 'cli-package');
            assert.strictEqual(instanceToRun.releasePR.changelogPath, 'CHANGELOG.md');
            // Defaults to Node.js release type:
            assert.strictEqual(instanceToRun.releasePR.constructor.name, 'Node');
        });
        mocha_1.it('instantiates a GitHub released without releaseType', async () => {
            sandbox.replace(factory_1.factory, 'call', callStub);
            const cmd = 'github-release --repo-url=googleapis/release-please-cli ';
            release_please_1.parser.parse(cmd);
            assert.strictEqual(methodCalled, 'run');
            assert.ok(instanceToRun instanceof github_release_1.GitHubRelease);
            assert.strictEqual(instanceToRun.releasePR.constructor.name, 'ReleasePR');
            assert.strictEqual((await instanceToRun.releasePR.getPackageName()).name, '');
        });
    });
});
//# sourceMappingURL=cli.js.map