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
exports.CargoLock = void 0;
const toml_edit_1 = require("../toml-edit");
const common_1 = require("./common");
const logger_1 = require("../../util/logger");
/**
 * Updates `Cargo.lock` lockfiles, preserving formatting and comments.
 */
class CargoLock {
    constructor(options) {
        this.create = false;
        this.path = options.path;
        this.changelogEntry = options.changelogEntry;
        this.version = options.version;
        this.versions = options.versions;
        this.packageName = options.packageName;
    }
    updateContent(content) {
        let payload = content;
        if (!this.versions) {
            throw new Error('updateContent called with no versions');
        }
        const parsed = common_1.parseCargoLockfile(payload);
        if (!parsed.package) {
            logger_1.logger.error(`${this.path} is not a Cargo lockfile`);
            throw new Error(`${this.path} is not a Cargo lockfile`);
        }
        // n.b for `replaceTomlString`, we need to keep track of the index
        // (position) of the package we're considering.
        for (let i = 0; i < parsed.package.length; i++) {
            const pkg = parsed.package[i];
            if (!pkg.name) {
                // all `[[package]]` entries should have a name,
                // but if they don't, ignore them silently.
                continue; // to next package
            }
            const nextVersion = this.versions.get(pkg.name);
            if (!nextVersion) {
                // this package is not upgraded.
                continue; // to next package
            }
            // note: in ECMAScript, using strings to index arrays is perfectly valid,
            // which is lucky because `replaceTomlString` expect "all strings" in its
            // `path` argument.
            const packageIndex = i.toString();
            logger_1.logger.info(`updating ${pkg.name} in ${this.path}`);
            payload = toml_edit_1.replaceTomlValue(payload, ['package', packageIndex, 'version'], nextVersion);
        }
        return payload;
    }
}
exports.CargoLock = CargoLock;
//# sourceMappingURL=cargo-lock.js.map