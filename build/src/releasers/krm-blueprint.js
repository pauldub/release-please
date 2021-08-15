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
exports.KRMBlueprint = void 0;
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// KRM specific.
const krm_blueprint_version_1 = require("../updaters/krm/krm-blueprint-version");
const KRMBlueprintAttribAnnotation = 'cnrm.cloud.google.com/blueprint';
const hasKRMBlueprintAttrib = (content) => content.includes(KRMBlueprintAttribAnnotation);
class KRMBlueprint extends release_pr_1.ReleasePR {
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        const versionsMap = new Map();
        if (candidate.previousTag) {
            // if previousTag of form pkgName-vX.x.x, we only require vX.x.x for attrib update
            const previousVersion = candidate.previousTag.replace(`${packageName.name}-`, '');
            versionsMap.set('previousVersion', previousVersion);
        }
        // Update version in all yaml files with attribution annotation
        const yamlPaths = await this.gh.findFilesByExtension('yaml', this.path);
        for (const yamlPath of yamlPaths) {
            const contents = await this.gh.getFileContents(this.addPath(yamlPath));
            if (hasKRMBlueprintAttrib(contents.parsedContent)) {
                updates.push(new krm_blueprint_version_1.KRMBlueprintVersion({
                    path: this.addPath(yamlPath),
                    changelogEntry,
                    version: candidate.version,
                    packageName: packageName.name,
                    versions: versionsMap,
                }));
            }
        }
        return updates;
    }
    defaultInitialVersion() {
        return '0.1.0';
    }
}
exports.KRMBlueprint = KRMBlueprint;
//# sourceMappingURL=krm-blueprint.js.map