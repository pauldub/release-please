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
exports.TerraformModule = void 0;
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// Terraform specific.
const readme_1 = require("../updaters/terraform/readme");
const module_version_1 = require("../updaters/terraform/module-version");
class TerraformModule extends release_pr_1.ReleasePR {
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        // Update version in README to current candidate version.
        // A module may have submodules, so find all submodules.
        const readmeFiles = await this.gh.findFilesByFilename('readme.md');
        readmeFiles.forEach(path => {
            updates.push(new readme_1.ReadMe({
                path: this.addPath(path),
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        // Update versions.tf to current candidate version.
        // A module may have submodules, so find all versions.tfand versions.tf.tmpl to update.
        const versionFiles = await Promise.all([
            this.gh.findFilesByFilename('versions.tf'),
            this.gh.findFilesByFilename('versions.tf.tmpl'),
        ]).then(([v, vt]) => {
            return v.concat(vt);
        });
        versionFiles.forEach(path => {
            updates.push(new module_version_1.ModuleVersion({
                path: this.addPath(path),
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        return updates;
    }
    defaultInitialVersion() {
        return '0.1.0';
    }
}
exports.TerraformModule = TerraformModule;
//# sourceMappingURL=terraform-module.js.map