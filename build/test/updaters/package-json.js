"use strict";
// Copyright 2019 Google LLC
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
const fs_1 = require("fs");
const path_1 = require("path");
const snapshot = require("snap-shot-it");
const mocha_1 = require("mocha");
const package_json_1 = require("../../src/updaters/package-json");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('PackageJson', () => {
    mocha_1.describe('updateContent', () => {
        mocha_1.it('updates the package version', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './package.json'), 'utf8');
            const packageJson = new package_json_1.PackageJson({
                path: 'package.json',
                changelogEntry: '',
                version: '14.0.0',
                packageName: '@google-cloud/foo',
            });
            const newContent = packageJson.updateContent(oldContent);
            snapshot(newContent.replace(/\r\n/g, '\n'));
        });
    });
});
//# sourceMappingURL=package-json.js.map