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
exports.CommitSplit = void 0;
class CommitSplit {
    constructor(opts) {
        opts = opts || {};
        this.includeEmpty = !!opts.includeEmpty;
        if (opts.packagePaths) {
            const paths = [];
            for (let newPath of opts.packagePaths) {
                // The special "." path, representing the root of the module, should be
                // ignored by commit-split as it is assigned all commits in manifest.ts
                if (newPath === '.') {
                    continue;
                }
                // normalize so that all paths have leading and trailing slashes for
                // non-overlap validation.
                // NOTE: GitHub API always returns paths using the `/` separator,
                // regardless of what platform the client code is running on
                newPath = newPath.replace(/\/$/, '');
                newPath = newPath.replace(/^\//, '');
                newPath = newPath.replace(/$/, '/');
                newPath = newPath.replace(/^/, '/');
                for (let exPath of paths) {
                    exPath = exPath.replace(/$/, '/');
                    exPath = exPath.replace(/^/, '/');
                    if (newPath.indexOf(exPath) >= 0 || exPath.indexOf(newPath) >= 0) {
                        throw new Error(`Path prefixes must be unique: ${newPath}, ${exPath}`);
                    }
                }
                // store them with leading and trailing slashes removed.
                newPath = newPath.replace(/\/$/, '');
                newPath = newPath.replace(/^\//, '');
                paths.push(newPath);
            }
            this.packagePaths = paths;
        }
    }
    split(commits) {
        const splitCommits = {};
        commits.forEach((commit) => {
            const dedupe = new Set();
            for (let i = 0; i < commit.files.length; i++) {
                const file = commit.files[i];
                // NOTE: GitHub API always returns paths using the `/` separator,
                // regardless of what platform the client code is running on
                const splitPath = file.split('/');
                // indicates that we have a top-level file and not a folder
                // in this edge-case we should not attempt to update the path.
                if (splitPath.length === 1)
                    continue;
                let pkgName;
                if (this.packagePaths) {
                    // only track paths under this.packagePaths
                    pkgName = this.packagePaths.find(p => file.indexOf(`${p}/`) === 0);
                }
                else {
                    // track paths by top level folder
                    pkgName = splitPath[0];
                }
                if (!pkgName || dedupe.has(pkgName))
                    continue;
                else
                    dedupe.add(pkgName);
                if (!splitCommits[pkgName])
                    splitCommits[pkgName] = [];
                splitCommits[pkgName].push(commit);
            }
            if (commit.files.length === 0 && this.includeEmpty) {
                for (const pkgName in splitCommits) {
                    splitCommits[pkgName].push(commit);
                }
            }
        });
        return splitCommits;
    }
}
exports.CommitSplit = CommitSplit;
//# sourceMappingURL=commit-split.js.map