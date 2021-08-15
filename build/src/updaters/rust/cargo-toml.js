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
exports.CargoToml = void 0;
const toml_edit_1 = require("../toml-edit");
const common_1 = require("./common");
const logger_1 = require("../../util/logger");
/**
 * Updates `Cargo.toml` manifests, preserving formatting and comments.
 */
class CargoToml {
    constructor(options) {
        this.create = false;
        this.path = options.path;
        this.changelogEntry = options.changelogEntry;
        this.version = options.version;
        this.versions = options.versions;
        this.packageName = options.packageName;
    }
    updateContent(content) {
        var _a;
        let payload = content;
        if (!this.versions) {
            throw new Error('updateContent called with no versions');
        }
        const parsed = common_1.parseCargoManifest(payload);
        if (!parsed.package) {
            const msg = `${this.path} is not a package manifest (might be a cargo workspace)`;
            logger_1.logger.error(msg);
            throw new Error(msg);
        }
        for (const [pkgName, pkgVersion] of this.versions) {
            if (parsed.package.name === pkgName) {
                logger_1.logger.info(`updating ${this.path}'s own version from ${(_a = parsed.package) === null || _a === void 0 ? void 0 : _a.version} to ${pkgVersion}`);
                payload = toml_edit_1.replaceTomlValue(payload, ['package', 'version'], pkgVersion);
                continue; // to next [pkgName, pkgVersion] pair
            }
            for (const depKind of common_1.DEP_KINDS) {
                const deps = parsed[depKind];
                if (!deps) {
                    continue; // to next depKind
                }
                if (!deps[pkgName]) {
                    continue; // to next depKind
                }
                const dep = deps[pkgName];
                if (typeof dep === 'string' || typeof dep.path === 'undefined') {
                    logger_1.logger.info(`skipping ${depKind}.${pkgName} in ${this.path}`);
                    continue; // to next depKind
                }
                logger_1.logger.info(`updating ${this.path} ${depKind}.${pkgName} from ${dep.version} to ${pkgVersion}`);
                payload = toml_edit_1.replaceTomlValue(payload, [depKind, pkgName, 'version'], pkgVersion);
            }
            // Update platform-specific dependencies
            if (parsed.target) {
                for (const targetName of Object.keys(parsed.target)) {
                    for (const depKind of common_1.DEP_KINDS) {
                        const deps = parsed.target[targetName][depKind];
                        if (!deps) {
                            continue; // to next depKind
                        }
                        if (!deps[pkgName]) {
                            continue; // to next depKind
                        }
                        const dep = deps[pkgName];
                        if (typeof dep === 'string' || typeof dep.path === 'undefined') {
                            logger_1.logger.info(`skipping target.${targetName}.${depKind}.${pkgName} in ${this.path}`);
                            continue; // to next depKind
                        }
                        logger_1.logger.info(`updating ${this.path} target.${targetName}.${depKind}.${pkgName} from ${dep.version} to ${pkgVersion}`);
                        payload = toml_edit_1.replaceTomlValue(payload, ['target', targetName, depKind, pkgName, 'version'], pkgVersion);
                    }
                }
            }
        }
        return payload;
    }
}
exports.CargoToml = CargoToml;
//# sourceMappingURL=cargo-toml.js.map