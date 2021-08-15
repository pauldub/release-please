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
const branch_name_1 = require("../../src/util/branch-name");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
mocha_1.describe('BranchName', () => {
    mocha_1.describe('parse', () => {
        mocha_1.describe('autorelease branch name', () => {
            mocha_1.it('parses a versioned branch name', () => {
                const name = 'release-v1.2.3';
                const branchName = branch_name_1.BranchName.parse(name);
                chai_1.expect(branchName).to.not.be.undefined;
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getTargetBranch()).to.be.undefined;
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getComponent()).to.be.undefined;
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getVersion()).to.eql('1.2.3');
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.toString()).to.eql(name);
            });
            mocha_1.it('parses a versioned branch name with component', () => {
                const name = 'release-storage-v1.2.3';
                const branchName = branch_name_1.BranchName.parse(name);
                chai_1.expect(branchName).to.not.be.undefined;
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getTargetBranch()).to.be.undefined;
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getComponent()).to.eql('storage');
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getVersion()).to.eql('1.2.3');
                chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.toString()).to.eql(name);
            });
        });
        mocha_1.it('parses a target branch', () => {
            const name = 'release-please/branches/main';
            const branchName = branch_name_1.BranchName.parse(name);
            chai_1.expect(branchName).to.not.be.undefined;
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getTargetBranch()).to.eql('main');
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getComponent()).to.be.undefined;
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getVersion()).to.be.undefined;
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.toString()).to.eql(name);
        });
        mocha_1.it('parses a target branch and component', () => {
            const name = 'release-please/branches/main/components/storage';
            const branchName = branch_name_1.BranchName.parse(name);
            chai_1.expect(branchName).to.not.be.undefined;
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getTargetBranch()).to.eql('main');
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getComponent()).to.eql('storage');
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.getVersion()).to.be.undefined;
            chai_1.expect(branchName === null || branchName === void 0 ? void 0 : branchName.toString()).to.eql(name);
        });
        mocha_1.it('fails to parse', () => {
            const branchName = branch_name_1.BranchName.parse('release-foo');
            chai_1.expect(branchName).to.be.undefined;
        });
    });
    mocha_1.describe('ofVersion', () => {
        mocha_1.it('builds the autorelease versioned branch name', () => {
            const branchName = branch_name_1.BranchName.ofVersion('1.2.3');
            chai_1.expect(branchName.toString()).to.eql('release-v1.2.3');
        });
    });
    mocha_1.describe('ofComponentVersion', () => {
        mocha_1.it('builds the autorelease versioned branch name with component', () => {
            const branchName = branch_name_1.BranchName.ofComponentVersion('storage', '1.2.3');
            chai_1.expect(branchName.toString()).to.eql('release-storage-v1.2.3');
        });
    });
    mocha_1.describe('ofTargetBranch', () => {
        mocha_1.it('builds branchname with only target branch', () => {
            const branchName = branch_name_1.BranchName.ofTargetBranch('main');
            chai_1.expect(branchName.toString()).to.eql('release-please/branches/main');
        });
    });
    mocha_1.describe('ofComponentTargetBranch', () => {
        mocha_1.it('builds branchname with target branch and component', () => {
            const branchName = branch_name_1.BranchName.ofComponentTargetBranch('foo', 'main');
            chai_1.expect(branchName.toString()).to.eql('release-please/branches/main/components/foo');
        });
    });
});
//# sourceMappingURL=branch-name.js.map