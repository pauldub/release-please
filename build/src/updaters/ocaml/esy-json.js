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
exports.EsyJson = void 0;
const logger_1 = require("../../util/logger");
const json_stringify_1 = require("../../util/json-stringify");
class EsyJson {
    constructor(options) {
        this.create = false;
        this.path = options.path;
        this.changelogEntry = options.changelogEntry;
        this.version = options.version;
        this.packageName = options.packageName;
    }
    updateContent(content) {
        const parsed = JSON.parse(content);
        logger_1.logger.info(`updating ${this.path} from ${parsed.version} to ${this.version}`);
        parsed.version = this.version;
        return json_stringify_1.jsonStringify(parsed, content);
    }
}
exports.EsyJson = EsyJson;
//# sourceMappingURL=esy-json.js.map