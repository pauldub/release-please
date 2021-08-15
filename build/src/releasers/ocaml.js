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
exports.OCaml = void 0;
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// OCaml
const opam_1 = require("../updaters/ocaml/opam");
const esy_json_1 = require("../updaters/ocaml/esy-json");
const dune_project_1 = require("../updaters/ocaml/dune-project");
const notEsyLock = (path) => !path.startsWith('esy.lock');
class OCaml extends release_pr_1.ReleasePR {
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        const jsonPaths = await this.gh.findFilesByExtension('json', this.path);
        for (const path of jsonPaths) {
            if (notEsyLock(path)) {
                const contents = await this.gh.getFileContents(this.addPath(path));
                const pkg = JSON.parse(contents.parsedContent);
                if (pkg.version !== undefined) {
                    updates.push(new esy_json_1.EsyJson({
                        path: this.addPath(path),
                        changelogEntry,
                        version: candidate.version,
                        packageName: packageName.name,
                        contents,
                    }));
                }
            }
        }
        const opamPaths = await this.gh.findFilesByExtension('opam', this.path);
        opamPaths.filter(notEsyLock).forEach(path => {
            updates.push(new opam_1.Opam({
                path: this.addPath(path),
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        updates.push(new dune_project_1.DuneProject({
            path: this.addPath('dune-project'),
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
        return updates;
    }
}
exports.OCaml = OCaml;
//# sourceMappingURL=ocaml.js.map