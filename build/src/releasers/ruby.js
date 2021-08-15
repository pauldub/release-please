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
exports.Ruby = void 0;
const release_pr_1 = require("../release-pr");
const indent_commit_1 = require("../util/indent-commit");
// Generic
const changelog_1 = require("../updaters/changelog");
// Ruby
const version_rb_1 = require("../updaters/version-rb");
class Ruby extends release_pr_1.ReleasePR {
    constructor(options) {
        var _a;
        super(options);
        this.versionFile = (_a = options.versionFile) !== null && _a !== void 0 ? _a : '';
    }
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        updates.push(new version_rb_1.VersionRB({
            path: this.addPath(this.versionFile),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        return updates;
    }
    tagSeparator() {
        return '/';
    }
    async commits(opts) {
        return postProcessCommits(await super.commits(opts));
    }
}
exports.Ruby = Ruby;
function postProcessCommits(commits) {
    commits.forEach(commit => {
        commit.message = indent_commit_1.indentCommit(commit);
    });
    return commits;
}
//# sourceMappingURL=ruby.js.map