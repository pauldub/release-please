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
exports.ChartYaml = void 0;
const yaml = require("js-yaml");
const logger_1 = require("../../util/logger");
class ChartYaml {
    constructor(options) {
        this.create = false;
        this.path = options.path;
        this.changelogEntry = options.changelogEntry;
        this.version = options.version;
        this.packageName = options.packageName;
    }
    updateContent(content) {
        const data = yaml.load(content, { json: true });
        if (data === null || data === undefined) {
            return '';
        }
        const parsed = JSON.parse(JSON.stringify(data));
        logger_1.logger.info(`updating ${this.path} from ${parsed.version} to ${this.version}`);
        parsed.version = this.version;
        return yaml.dump(parsed);
    }
}
exports.ChartYaml = ChartYaml;
//# sourceMappingURL=chart-yaml.js.map