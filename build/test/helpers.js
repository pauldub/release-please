"use strict";
// Copyright 2020 Google LLC
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
exports.buildMockCommit = exports.readPOJO = exports.stringifyExpectedChanges = exports.dateSafe = exports.stubSuggesterWithSnapshot = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto = require("crypto");
const suggester = require("code-suggester");
const snapshot = require("snap-shot-it");
function stubSuggesterWithSnapshot(sandbox, snapName) {
    sandbox.replace(suggester, 'createPullRequest', (_octokit, changes, options) => {
        snapshot(snapName + ': changes', stringifyExpectedChanges([...changes]));
        snapshot(snapName + ': options', stringifyExpectedOptions(options));
        return Promise.resolve(22);
    });
}
exports.stubSuggesterWithSnapshot = stubSuggesterWithSnapshot;
function dateSafe(content) {
    return content.replace(/[0-9]{4}-[0-9]{2}-[0-9]{2}/g, '1983-10-10' // use a fake date, so that we don't break daily.
    );
}
exports.dateSafe = dateSafe;
function stringifyExpectedOptions(expected) {
    expected.description = newLine(expected.description);
    let stringified = '';
    for (const [option, value] of Object.entries(expected)) {
        stringified = `${stringified}\n${option}: ${value}`;
    }
    return dateSafe(stringified);
}
function newLine(content) {
    return content.replace(/\r\n/g, '\n');
}
/*
 * Given an object of chnages expected to be made by code-suggester API,
 * stringify content in such a way that it works well for snapshots:
 */
function stringifyExpectedChanges(expected) {
    let stringified = '';
    for (const update of expected) {
        stringified = `${stringified}\nfilename: ${update[0]}`;
        const obj = update[1];
        stringified = `${stringified}\n${newLine(obj.content)}`;
    }
    return dateSafe(stringified);
}
exports.stringifyExpectedChanges = stringifyExpectedChanges;
/*
 * Reads a plain-old-JavaScript object, stored in fixtures directory.
 * these are used to represent responses from the methods in the github.ts
 * wrapper for GitHub API calls:
 */
function readPOJO(name) {
    const content = fs_1.readFileSync(path_1.resolve('./test/fixtures/pojos', `${name}.json`), 'utf8');
    return JSON.parse(content);
}
exports.readPOJO = readPOJO;
function buildMockCommit(message, files = []) {
    return {
        sha: crypto.createHash('md5').update(message).digest('hex'),
        message,
        files: files,
    };
}
exports.buildMockCommit = buildMockCommit;
//# sourceMappingURL=helpers.js.map