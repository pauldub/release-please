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
exports.ManifestPlugin = void 0;
const checkpoint_1 = require("../util/checkpoint");
class ManifestPlugin {
    constructor(github, config, tag, logger) {
        this.gh = github;
        this.config = config;
        this.checkpoint = logger || checkpoint_1.checkpoint;
        this.tag = tag;
    }
    log(msg, cpType) {
        this.checkpoint(`${this.tag}: ${msg}`, cpType);
    }
}
exports.ManifestPlugin = ManifestPlugin;
//# sourceMappingURL=plugin.js.map