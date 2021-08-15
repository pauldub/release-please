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
const pull_request_title_1 = require("../../src/util/pull-request-title");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
mocha_1.describe('PullRequestTitle', () => {
    mocha_1.describe('parse', () => {
        mocha_1.describe('autorelease branch name', () => {
            mocha_1.it('parses a versioned branch name', () => {
                const name = 'chore: release 1.2.3';
                const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name);
                chai_1.expect(pullRequestTitle).to.not.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.toString()).to.eql(name);
            });
            mocha_1.it('parses a versioned branch name with v', () => {
                const name = 'chore: release v1.2.3';
                const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name);
                chai_1.expect(pullRequestTitle).to.not.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
            });
            mocha_1.it('parses a versioned branch name with component', () => {
                const name = 'chore: release storage v1.2.3';
                const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name);
                chai_1.expect(pullRequestTitle).to.not.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.eql('storage');
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
            });
        });
        mocha_1.it('parses a target branch', () => {
            const name = 'chore(main): release v1.2.3';
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name);
            chai_1.expect(pullRequestTitle).to.not.be.undefined;
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.eql('main');
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.be.undefined;
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
        });
        mocha_1.it('parses a target branch and component', () => {
            const name = 'chore(main): release storage v1.2.3';
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name);
            chai_1.expect(pullRequestTitle).to.not.be.undefined;
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.eql('main');
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.eql('storage');
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
        });
        mocha_1.it('fails to parse', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse('release-foo');
            chai_1.expect(pullRequestTitle).to.be.undefined;
        });
    });
    mocha_1.describe('ofVersion', () => {
        mocha_1.it('builds the autorelease versioned branch name', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofVersion('1.2.3');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore: release 1.2.3');
        });
    });
    mocha_1.describe('ofComponentVersion', () => {
        mocha_1.it('builds the autorelease versioned branch name with component', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofComponentVersion('storage', '1.2.3');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore: release storage 1.2.3');
        });
    });
    mocha_1.describe('ofTargetBranch', () => {
        mocha_1.it('builds branchname with only target branch', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofTargetBranchVersion('main', '1.2.3');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore(main): release 1.2.3');
        });
    });
    mocha_1.describe('ofComponentTargetBranch', () => {
        mocha_1.it('builds branchname with target branch and component', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofComponentTargetBranchVersion('foo', 'main', '1.2.3');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore(main): release foo 1.2.3');
        });
    });
    mocha_1.describe('generateMatchPattern', () => {
        mocha_1.it('return matchPattern with default Pattern', () => {
            const matchPattern = pull_request_title_1.generateMatchPattern();
            chai_1.expect(matchPattern).to.eql(/^chore(\((?<branch>[\w-.]+)\))?: release ?(?<component>[\w-.]*)? v?(?<version>[0-9].*)$/);
        });
    });
});
mocha_1.describe('PullRequestTitle with custom pullRequestTitlePattern', () => {
    mocha_1.describe('parse', () => {
        mocha_1.describe('autorelease branch name', () => {
            mocha_1.it('parses a versioned branch name', () => {
                const name = 'chore: 🔖 release 1.2.3';
                const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name, 'chore${scope}: 🔖 release${component} ${version}');
                chai_1.expect(pullRequestTitle).to.not.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.toString()).to.eql(name);
            });
            mocha_1.it('parses a versioned branch name with v', () => {
                const name = 'chore: 🔖 release v1.2.3';
                const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name, 'chore${scope}: 🔖 release${component} ${version}');
                chai_1.expect(pullRequestTitle).to.not.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
            });
            mocha_1.it('parses a versioned branch name with component', () => {
                const name = 'chore: 🔖 release storage v1.2.3';
                const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name, 'chore${scope}: 🔖 release${component} ${version}');
                chai_1.expect(pullRequestTitle).to.not.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.be.undefined;
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.eql('storage');
                chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
            });
        });
        mocha_1.it('parses a target branch', () => {
            const name = 'chore(main): 🔖 release v1.2.3';
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name, 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle).to.not.be.undefined;
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.eql('main');
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.be.undefined;
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
        });
        mocha_1.it('parses a target branch and component', () => {
            const name = 'chore(main): 🔖 release storage v1.2.3';
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse(name, 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle).to.not.be.undefined;
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getTargetBranch()).to.eql('main');
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getComponent()).to.eql('storage');
            chai_1.expect(pullRequestTitle === null || pullRequestTitle === void 0 ? void 0 : pullRequestTitle.getVersion()).to.eql('1.2.3');
        });
        mocha_1.it('fails to parse', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.parse('release-foo', 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle).to.be.undefined;
        });
    });
    mocha_1.describe('ofVersion', () => {
        mocha_1.it('builds the autorelease versioned branch name', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofVersion('1.2.3', 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore: 🔖 release 1.2.3');
        });
    });
    mocha_1.describe('ofComponentVersion', () => {
        mocha_1.it('builds the autorelease versioned branch name with component', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofComponentVersion('storage', '1.2.3', 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore: 🔖 release storage 1.2.3');
        });
    });
    mocha_1.describe('ofTargetBranch', () => {
        mocha_1.it('builds branchname with only target branch', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofTargetBranchVersion('main', '1.2.3', 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore(main): 🔖 release 1.2.3');
        });
    });
    mocha_1.describe('ofComponentTargetBranch', () => {
        mocha_1.it('builds branchname with target branch and component', () => {
            const pullRequestTitle = pull_request_title_1.PullRequestTitle.ofComponentTargetBranchVersion('foo', 'main', '1.2.3', 'chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(pullRequestTitle.toString()).to.eql('chore(main): 🔖 release foo 1.2.3');
        });
    });
    mocha_1.describe('generateMatchPattern', () => {
        mocha_1.it('return matchPattern with custom Pattern', () => {
            const matchPattern = pull_request_title_1.generateMatchPattern('chore${scope}: 🔖 release${component} ${version}');
            chai_1.expect(matchPattern).to.eql(/^chore(\((?<branch>[\w-.]+)\))?: 🔖 release ?(?<component>[\w-.]*)? v?(?<version>[0-9].*)$/);
        });
        mocha_1.it('throw Error with custom Pattern missing ${scope}', () => {
            chai_1.expect(() => pull_request_title_1.generateMatchPattern('chore: 🔖 release${component} ${version}')).to.throw("pullRequestTitlePattern miss the part of '${scope}'");
        });
        mocha_1.it('throw Error with custom Pattern missing ${component}', () => {
            chai_1.expect(() => pull_request_title_1.generateMatchPattern('chore${scope}: 🔖 release ${version}')).to.throw("pullRequestTitlePattern miss the part of '${component}'");
        });
        mocha_1.it('throw Error with custom Pattern missing ${version}', () => {
            chai_1.expect(() => pull_request_title_1.generateMatchPattern('chore${scope}: 🔖 release${component}')).to.throw("pullRequestTitlePattern miss the part of '${version}'");
        });
    });
});
//# sourceMappingURL=pull-request-title.js.map