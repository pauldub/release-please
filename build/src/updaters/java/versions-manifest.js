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
exports.VersionsManifest = void 0;
const java_update_1 = require("./java_update");
class VersionsManifest extends java_update_1.JavaUpdate {
    updateContent(content) {
        let newContent = content;
        this.versions.forEach((version, packageName) => {
            newContent = this.updateSingleVersion(newContent, packageName, version);
        });
        return newContent;
    }
    updateSingleVersion(content, packageName, version) {
        const newLines = [];
        content.split(/\r?\n/).forEach(line => {
            if (version.includes('SNAPSHOT')) {
                newLines.push(line.replace(new RegExp(`${packageName}:(.*):(.*)`, 'g'), `${packageName}:$1:${version}`));
            }
            else {
                newLines.push(line.replace(new RegExp(`${packageName}:(.*):(.*)`, 'g'), `${packageName}:${version}:${version}`));
            }
        });
        return newLines.join('\n');
    }
    static parseVersions(content) {
        const versions = new Map();
        content.split(/\r?\n/).forEach(line => {
            const match = line.match(/^([\w\-_]+):([^:]+):([^:]+)/);
            if (match) {
                versions.set(match[1], match[2]);
            }
        });
        return versions;
    }
    static needsSnapshot(content) {
        return !content.split(/\r?\n/).some(line => {
            return !!line.match(/^[\w\-_]+:.+:.+-SNAPSHOT/);
        });
    }
}
exports.VersionsManifest = VersionsManifest;
//# sourceMappingURL=versions-manifest.js.map