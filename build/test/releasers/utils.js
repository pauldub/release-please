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
exports.getFilesInDirWithPrefix = exports.getFilesInDir = exports.stubFilesFromFixtures = exports.buildGitHubFileRaw = exports.buildGitHubFileContent = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto = require("crypto");
function buildGitHubFileContent(fixturesPath, fixture) {
    return buildGitHubFileRaw(fs_1.readFileSync(path_1.resolve(fixturesPath, fixture), 'utf8').replace(/\r\n/g, '\n'));
}
exports.buildGitHubFileContent = buildGitHubFileContent;
function buildGitHubFileRaw(content) {
    return {
        content: Buffer.from(content, 'utf8').toString('base64'),
        parsedContent: content,
        // fake a consistent sha
        sha: crypto.createHash('md5').update(content).digest('hex'),
    };
}
exports.buildGitHubFileRaw = buildGitHubFileRaw;
function stubFilesFromFixtures(options) {
    var _a, _b, _c;
    const { fixturePath, sandbox, github, files } = options;
    const inlineFiles = (_a = options.inlineFiles) !== null && _a !== void 0 ? _a : [];
    const overlap = inlineFiles.filter(f => files.includes(f[0]));
    if (overlap.length > 0) {
        throw new Error('Overlap between files and inlineFiles: ' + JSON.stringify(overlap));
    }
    const defaultBranch = (_b = options.defaultBranch) !== null && _b !== void 0 ? _b : 'master';
    const flatten = (_c = options.flatten) !== null && _c !== void 0 ? _c : true;
    const stub = sandbox.stub(github, 'getFileContentsOnBranch');
    for (const file of files) {
        let fixtureFile = file;
        if (flatten) {
            const parts = file.split('/');
            fixtureFile = parts[parts.length - 1];
        }
        stub
            .withArgs(file, defaultBranch)
            .resolves(buildGitHubFileContent(fixturePath, fixtureFile));
    }
    for (const [file, content] of inlineFiles) {
        stub.withArgs(file, defaultBranch).resolves(buildGitHubFileRaw(content));
    }
    stub.rejects(Object.assign(Error('not found'), { status: 404 }));
}
exports.stubFilesFromFixtures = stubFilesFromFixtures;
// get list of files in a directory
function getFilesInDir(directory, fileList = []) {
    const items = fs_1.readdirSync(directory);
    for (const item of items) {
        const stat = fs_1.statSync(path_1.posix.join(directory, item));
        if (stat.isDirectory())
            fileList = getFilesInDir(path_1.posix.join(directory, item), fileList);
        else
            fileList.push(path_1.posix.join(directory, item));
    }
    return fileList;
}
exports.getFilesInDir = getFilesInDir;
// get list of files with a particular prefix in a directory
function getFilesInDirWithPrefix(directory, prefix) {
    const allFiles = getFilesInDir(directory);
    return allFiles
        .filter(p => {
        return path_1.posix.extname(p) === `.${prefix}`;
    })
        .map(p => path_1.posix.relative(directory, p));
}
exports.getFilesInDirWithPrefix = getFilesInDirWithPrefix;
//# sourceMappingURL=utils.js.map