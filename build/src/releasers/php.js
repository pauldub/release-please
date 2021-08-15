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
exports.PHP = void 0;
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// PHP Specific.
const root_composer_update_package_1 = require("../updaters/root-composer-update-package");
const CHANGELOG_SECTIONS = [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'revert', section: 'Reverts' },
    { type: 'chore', section: 'Miscellaneous Chores' },
    { type: 'docs', section: 'Documentation', hidden: true },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'refactor', section: 'Code Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'build', section: 'Build System', hidden: true },
    { type: 'ci', section: 'Continuous Integration', hidden: true },
];
class PHP extends release_pr_1.ReleasePR {
    constructor(options) {
        var _a;
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        super(options);
        this.changelogSections = (_a = options.changelogSections) !== null && _a !== void 0 ? _a : CHANGELOG_SECTIONS;
    }
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        const versions = new Map();
        versions.set('version', candidate.version);
        // update composer.json
        updates.push(new root_composer_update_package_1.RootComposerUpdatePackage({
            path: 'composer.json',
            changelogEntry,
            version: candidate.version,
            versions: versions,
            packageName: packageName.name,
        }));
        // update Changelog
        updates.push(new changelog_1.Changelog({
            path: this.changelogPath,
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        return updates;
    }
}
exports.PHP = PHP;
//# sourceMappingURL=php.js.map