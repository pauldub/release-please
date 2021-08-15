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
exports.PyProjectToml = exports.parsePyProject = void 0;
const TOML = require("@iarna/toml");
const toml_edit_1 = require("../toml-edit");
const logger_1 = require("../../util/logger");
function parsePyProject(content) {
    return TOML.parse(content);
}
exports.parsePyProject = parsePyProject;
class PyProjectToml {
    constructor(options) {
        this.create = false;
        this.path = options.path;
        this.changelogEntry = options.changelogEntry;
        this.version = options.version;
        this.packageName = options.packageName;
    }
    updateContent(content) {
        var _a;
        const parsed = parsePyProject(content);
        const project = parsed.project || ((_a = parsed.tool) === null || _a === void 0 ? void 0 : _a.poetry);
        if (!(project === null || project === void 0 ? void 0 : project.version)) {
            const msg = `invalid ${this.path}`;
            logger_1.logger.error(msg);
            throw new Error(msg);
        }
        return toml_edit_1.replaceTomlValue(content, (parsed.project ? ['project'] : ['tool', 'poetry']).concat('version'), this.version);
    }
}
exports.PyProjectToml = PyProjectToml;
//# sourceMappingURL=pyproject-toml.js.map