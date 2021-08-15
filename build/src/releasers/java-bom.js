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
exports.JavaBom = void 0;
// Java
const bump_type_1 = require("./java/bump_type");
const version_1 = require("./java/version");
const java_yoshi_1 = require("./java-yoshi");
const DEPENDENCY_UPDATE_REGEX = /^deps: update dependency (.*) to (v.*)(\s\(#\d+\))?$/m;
const DEPENDENCY_PATCH_VERSION_REGEX = /^v\d+\.\d+\.[1-9]\d*(-.*)?/;
class JavaBom extends java_yoshi_1.JavaYoshi {
    async coerceVersions(cc, _candidate, latestTag, currentVersions) {
        const bumpType = await this.getBumpType(cc, latestTag);
        const newVersions = new Map();
        for (const [k, version] of currentVersions) {
            newVersions.set(k, version_1.Version.parse(version).bump(bumpType).toString());
        }
        return newVersions;
    }
    async getBumpType(cc, latestTag) {
        if (!this.bumpType) {
            this.bumpType = this.snapshot
                ? 'snapshot'
                : bump_type_1.maxBumpType([
                    JavaBom.determineBumpType(cc.commits),
                    bump_type_1.fromSemverReleaseType((await cc.suggestBump((latestTag === null || latestTag === void 0 ? void 0 : latestTag.version) || this.defaultInitialVersion())).releaseType),
                ]);
        }
        return this.bumpType;
    }
    async coerceReleaseCandidate(cc, latestTag, _preRelease = false) {
        const bumpType = await this.getBumpType(cc, latestTag);
        return {
            version: latestTag
                ? version_1.Version.parse(latestTag.version).bump(bumpType).toString()
                : this.defaultInitialVersion(),
            previousTag: latestTag === null || latestTag === void 0 ? void 0 : latestTag.version,
        };
    }
    static dependencyUpdates(commits) {
        const versionsMap = new Map();
        commits.forEach(commit => {
            const match = commit.message.match(DEPENDENCY_UPDATE_REGEX);
            if (!match)
                return;
            // commits are sorted by latest first, so if there is a collision,
            // then we've already recorded the latest version
            if (versionsMap.has(match[1]))
                return;
            versionsMap.set(match[1], match[2]);
        });
        return versionsMap;
    }
    static isNonPatchVersion(commit) {
        let match = commit.message.match(DEPENDENCY_UPDATE_REGEX);
        if (!match)
            return false;
        match = match[2].match(DEPENDENCY_PATCH_VERSION_REGEX);
        if (!match)
            return true;
        return false;
    }
    static determineBumpType(commits) {
        if (commits.some(this.isNonPatchVersion)) {
            return 'minor';
        }
        return 'patch';
    }
}
exports.JavaBom = JavaBom;
//# sourceMappingURL=java-bom.js.map