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
const pom_xml_1 = require("../../src/updaters/java/pom-xml");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('PomXML', () => {
    mocha_1.describe('updateContent', () => {
        mocha_1.it('updates version in pom.xml', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './pom.xml'), 'utf8').replace(/\r\n/g, '\n');
            const pomXML = new pom_xml_1.PomXML({
                path: 'pom.xml',
                changelogEntry: '',
                version: '0.19.0',
                packageName: 'google-auth-library-parent',
            });
            const newContent = pomXML.updateContent(oldContent);
            snapshot(newContent);
        });
        mocha_1.it('handles specific versions in pom.xml', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './pom-multiple-versions.xml'), 'utf8').replace(/\r\n/g, '\n');
            const pomXML = new pom_xml_1.PomXML({
                path: 'pom.xml',
                changelogEntry: '',
                version: '0.19.0',
                packageName: 'google-cloud-trace',
            });
            const newContent = pomXML.updateContent(oldContent);
            snapshot(newContent);
        });
        mocha_1.it('handles multiple versions in pom.xml', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './pom-multiple-versions.xml'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            versions.set('proto-google-cloud-trace-v1', '0.25.0');
            versions.set('google-cloud-trace', '0.16.2-SNAPSHOT');
            const pomXML = new pom_xml_1.PomXML({
                path: 'pom.xml',
                changelogEntry: '',
                versions,
                version: 'unused',
                packageName: 'unused',
            });
            const newContent = pomXML.updateContent(oldContent);
            snapshot(newContent);
        });
    });
});
//# sourceMappingURL=pom-xml.js.map