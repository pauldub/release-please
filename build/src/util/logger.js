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
exports.setLogger = exports.logger = void 0;
const chalk = require("chalk");
const figures = require("figures");
const errorPrefix = chalk.red(figures.cross);
const warnPrefix = chalk.yellow(figures.warning);
const infoPrefix = chalk.green(figures.tick);
const debugPrefix = chalk.gray(figures.pointer);
const tracePrefix = chalk.dim.gray(figures.pointerSmall);
class CheckpointLogger {
    constructor() {
        this.error = (...args) => {
            console.error(`${errorPrefix}`, ...args);
        };
        this.warn = (...args) => {
            console.warn(`${warnPrefix}`, ...args);
        };
        this.info = (...args) => {
            console.info(`${infoPrefix}`, ...args);
        };
        this.debug = (...args) => {
            console.debug(`${debugPrefix}`, ...args);
        };
        this.trace = (...args) => {
            console.trace(`${tracePrefix}`, ...args);
        };
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
exports.logger = new CheckpointLogger();
function setLogger(userLogger) {
    exports.logger = userLogger;
}
exports.setLogger = setLogger;
//# sourceMappingURL=logger.js.map