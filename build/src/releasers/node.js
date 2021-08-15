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
exports.Node = void 0;
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// JavaScript
const package_json_1 = require("../updaters/package-json");
const package_lock_json_1 = require("../updaters/package-lock-json");
const samples_package_json_1 = require("../updaters/samples-package-json");
class Node extends release_pr_1.ReleasePR {
    constructor() {
        super(...arguments);
        this.enableSimplePrereleaseParsing = true;
    }
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        const lockFiles = ['package-lock.json', 'npm-shrinkwrap.json'];
        lockFiles.forEach(lockFile => {
            updates.push(new package_lock_json_1.PackageLockJson({
                path: this.addPath(lockFile),
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        updates.push(new samples_package_json_1.SamplesPackageJson({
            path: this.addPath('samples/package.json'),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        updates.push(new package_json_1.PackageJson({
            path: this.addPath('package.json'),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
            contents: await this.getPkgJsonContents(),
        }));
        return updates;
    }
    // Always prefer the package.json name
    async getPackageName() {
        var _a;
        if (this._packageName === undefined) {
            const pkgJsonContents = await this.getPkgJsonContents();
            const pkg = JSON.parse(pkgJsonContents.parsedContent);
            this.packageName = this._packageName = (_a = pkg.name) !== null && _a !== void 0 ? _a : this.packageName;
        }
        return {
            name: this.packageName,
            getComponent: () => this.packageName.match(/^@[\w-]+\//)
                ? this.packageName.split('/')[1]
                : this.packageName,
        };
    }
    async getPkgJsonContents() {
        if (!this.pkgJsonContents) {
            this.pkgJsonContents = await this.gh.getFileContents(this.addPath('package.json'));
        }
        return this.pkgJsonContents;
    }
}
exports.Node = Node;
//# sourceMappingURL=node.js.map