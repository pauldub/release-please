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
exports.BranchName = void 0;
// cannot import from '..' - transpiled code references to RELEASE_PLEASE
// at the script level are undefined, they are only defined inside function
// or instance methods/properties.
const constants_1 = require("../constants");
function getAllResourceNames() {
    return [AutoreleaseBranchName, ComponentBranchName, DefaultBranchName];
}
class BranchName {
    constructor(_branchName) { }
    static parse(branchName) {
        const branchNameClass = getAllResourceNames().find(clazz => {
            return clazz.matches(branchName);
        });
        if (!branchNameClass) {
            return undefined;
        }
        return new branchNameClass(branchName);
    }
    static ofComponentVersion(branchPrefix, version) {
        return new AutoreleaseBranchName(`release-${branchPrefix}-v${version}`);
    }
    static ofVersion(version) {
        return new AutoreleaseBranchName(`release-v${version}`);
    }
    static ofTargetBranch(targetBranch) {
        return new DefaultBranchName(`${constants_1.RELEASE_PLEASE}/branches/${targetBranch}`);
    }
    static ofComponentTargetBranch(component, targetBranch) {
        return new ComponentBranchName(`${constants_1.RELEASE_PLEASE}/branches/${targetBranch}/components/${component}`);
    }
    static matches(_branchName) {
        return false;
    }
    getTargetBranch() {
        return this.targetBranch;
    }
    getComponent() {
        return this.component;
    }
    getVersion() {
        return this.version;
    }
    toString() {
        return '';
    }
}
exports.BranchName = BranchName;
const AUTORELEASE_PATTERN = /^release-?(?<component>[\w-.]*)?-v(?<version>[0-9].*)$/;
class AutoreleaseBranchName extends BranchName {
    static matches(branchName) {
        return !!branchName.match(AUTORELEASE_PATTERN);
    }
    constructor(branchName) {
        super(branchName);
        const match = branchName.match(AUTORELEASE_PATTERN);
        if (match === null || match === void 0 ? void 0 : match.groups) {
            this.component = match.groups['component'];
            this.version = match.groups['version'];
        }
    }
    toString() {
        if (this.component) {
            return `release-${this.component}-v${this.version}`;
        }
        return `release-v${this.version}`;
    }
}
const DEFAULT_PATTERN = `^${constants_1.RELEASE_PLEASE}/branches/(?<branch>[^/]+)$`;
class DefaultBranchName extends BranchName {
    static matches(branchName) {
        return !!branchName.match(DEFAULT_PATTERN);
    }
    constructor(branchName) {
        super(branchName);
        const match = branchName.match(DEFAULT_PATTERN);
        if (match === null || match === void 0 ? void 0 : match.groups) {
            this.targetBranch = match.groups['branch'];
        }
    }
    toString() {
        return `${constants_1.RELEASE_PLEASE}/branches/${this.targetBranch}`;
    }
}
const COMPONENT_PATTERN = `^${constants_1.RELEASE_PLEASE}/branches/(?<branch>[^/]+)/components/(?<component>[^/]+)$`;
class ComponentBranchName extends BranchName {
    static matches(branchName) {
        return !!branchName.match(COMPONENT_PATTERN);
    }
    constructor(branchName) {
        super(branchName);
        const match = branchName.match(COMPONENT_PATTERN);
        if (match === null || match === void 0 ? void 0 : match.groups) {
            this.targetBranch = match.groups['branch'];
            this.component = match.groups['component'];
        }
    }
    toString() {
        return `${constants_1.RELEASE_PLEASE}/branches/${this.targetBranch}/components/${this.component}`;
    }
}
//# sourceMappingURL=branch-name.js.map