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
const readme_1 = require("../../src/updaters/java/readme");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('JavaAuthReadme', () => {
    mocha_1.describe('updateContent', () => {
        mocha_1.it('updates version examples in README.md', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './java-auth-readme.md'), 'utf8').replace(/\r\n/g, '\n');
            const javaAuthReadme = new readme_1.Readme({
                path: 'README.md',
                changelogEntry: '',
                version: '0.20.0',
                packageName: 'google-auth-library-oauth2-http',
            });
            const newContent = javaAuthReadme.updateContent(oldContent);
            snapshot(newContent);
        });
        mocha_1.it('updates multiple version examples in README.md', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './java-multiple-versions-readme.md'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            versions.set('google-auth-library-oauth2-http', '0.20.0');
            versions.set('google-auth-library-credentials', '0.30.0');
            const javaAuthReadme = new readme_1.Readme({
                path: 'README.md',
                changelogEntry: '',
                versions,
                version: 'unused',
                packageName: 'unused',
            });
            const newContent = javaAuthReadme.updateContent(oldContent);
            snapshot(newContent);
        });
    });
});
//# sourceMappingURL=java-auth-readme.js.map