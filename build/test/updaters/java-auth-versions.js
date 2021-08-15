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
const versions_manifest_1 = require("../../src/updaters/java/versions-manifest");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('JavaAuthVersions', () => {
    mocha_1.describe('updateContent', () => {
        mocha_1.it('updates versions.txt appropriately for non-SNAPSHOT release', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './java-auth-versions.txt'), 'utf8').replace(/\r\n/g, '\n');
            const javaAuthVersions = new versions_manifest_1.VersionsManifest({
                path: 'versions.txt',
                changelogEntry: '',
                version: '0.25.0',
                packageName: 'google-auth-library',
            });
            const newContent = javaAuthVersions.updateContent(oldContent);
            snapshot(newContent);
        });
        mocha_1.it('updates versions.txt appropriately for SNAPSHOT release', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './java-auth-versions.txt'), 'utf8').replace(/\r\n/g, '\n');
            const javaAuthVersions = new versions_manifest_1.VersionsManifest({
                path: 'versions.txt',
                changelogEntry: '',
                version: '0.16.2-SNAPSHOT',
                packageName: 'google-auth-library-oauth2-http',
            });
            const newContent = javaAuthVersions.updateContent(oldContent);
            snapshot(newContent);
        });
        mocha_1.it('updates multiple versions in versions.txt', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './java-auth-versions.txt'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            versions.set('google-auth-library', '0.25.0');
            versions.set('google-auth-library-oauth2-http', '0.16.2-SNAPSHOT');
            const javaAuthVersions = new versions_manifest_1.VersionsManifest({
                path: 'versions.txt',
                changelogEntry: '',
                versions,
                version: 'unused',
                packageName: 'used',
            });
            const newContent = javaAuthVersions.updateContent(oldContent);
            snapshot(newContent);
        });
    });
});
//# sourceMappingURL=java-auth-versions.js.map