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
exports.JavaLTS = void 0;
// Java
const version_1 = require("./java/version");
const java_yoshi_1 = require("./java-yoshi");
class JavaLTS extends java_yoshi_1.JavaYoshi {
    async coerceVersions(_cc, _candidate, _latestTag, currentVersions) {
        // Example versioning:
        //   1.2.3
        //   1.2.3-sp.1-SNAPSHOT
        //   1.2.3-sp.1
        //   1.2.3-sp.2-SNAPSHOT
        const bumpType = this.snapshot ? 'lts-snapshot' : 'lts';
        const newVersions = new Map();
        for (const [k, version] of currentVersions) {
            newVersions.set(k, version_1.Version.parse(version).bump(bumpType).toString());
        }
        return newVersions;
    }
    async coerceReleaseCandidate(cc, latestTag, _preRelease = false) {
        var _a;
        const bumpType = this.snapshot ? 'lts-snapshot' : 'lts';
        const version = version_1.Version.parse((_a = latestTag === null || latestTag === void 0 ? void 0 : latestTag.version) !== null && _a !== void 0 ? _a : this.defaultInitialVersion())
            .bump(bumpType)
            .toString();
        return {
            previousTag: latestTag === null || latestTag === void 0 ? void 0 : latestTag.version,
            version,
        };
    }
}
exports.JavaLTS = JavaLTS;
//# sourceMappingURL=java-lts.js.map