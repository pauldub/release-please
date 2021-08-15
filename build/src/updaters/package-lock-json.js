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
exports.PackageLockJson = void 0;
const package_json_1 = require("./package-json");
class PackageLockJson extends package_json_1.PackageJson {
    updateVersion(parsed) {
        super.updateVersion(parsed);
        if (parsed.lockfileVersion === 2) {
            const lockFileV2 = parsed;
            lockFileV2.packages[''].version = this.version;
        }
    }
}
exports.PackageLockJson = PackageLockJson;
//# sourceMappingURL=package-lock-json.js.map