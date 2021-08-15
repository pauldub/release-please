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
const chai_1 = require("chai");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('VersionManifest', () => {
    mocha_1.describe('parseVersions', () => {
        mocha_1.it('parses multiple versions in versions.txt', async () => {
            const content = fs_1.readFileSync(path_1.resolve(fixturesPath, './versions.txt'), 'utf8').replace(/\r\n/g, '\n');
            const versionsMap = versions_manifest_1.VersionsManifest.parseVersions(content);
            chai_1.expect(versionsMap.get('google-cloud-trace')).to.equal('0.108.0-beta');
            chai_1.expect(versionsMap.get('grpc-google-cloud-trace-v1')).to.equal('0.73.0');
            chai_1.expect(versionsMap.get('grpc-google-cloud-trace-v2')).to.equal('0.73.0');
            chai_1.expect(versionsMap.get('proto-google-cloud-trace-v1')).to.equal('0.73.0');
            chai_1.expect(versionsMap.get('grpc-google-cloud-trace-v2')).to.equal('0.73.0');
        });
    });
    mocha_1.describe('needsSnapshot', () => {
        mocha_1.it('parses detects a release version', async () => {
            const content = fs_1.readFileSync(path_1.resolve(fixturesPath, './versions-release.txt'), 'utf8').replace(/\r\n/g, '\n');
            chai_1.expect(versions_manifest_1.VersionsManifest.needsSnapshot(content)).to.equal(true);
        });
        mocha_1.it('parses detects an existing snapshot version', async () => {
            const content = fs_1.readFileSync(path_1.resolve(fixturesPath, './versions.txt'), 'utf8').replace(/\r\n/g, '\n');
            chai_1.expect(versions_manifest_1.VersionsManifest.needsSnapshot(content)).to.equal(false);
        });
    });
    mocha_1.describe('updateContent', () => {
        mocha_1.it('updates versions.txt with snapshot released version', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './versions-double-snapshot.txt'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            versions.set('google-cloud-trace', '0.109.0');
            versions.set('grpc-google-cloud-trace-v1', '0.74.0');
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
//# sourceMappingURL=version-manifest.js.map