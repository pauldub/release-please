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
const fs_1 = require("fs");
const path_1 = require("path");
const snapshot = require("snap-shot-it");
const mocha_1 = require("mocha");
const krm_blueprint_version_1 = require("../../src/updaters/krm/krm-blueprint-version");
const fixturesPath = './test/updaters/fixtures/krm';
mocha_1.describe('KRM Blueprint', () => {
    const tests = [
        {
            name: 'simpleKRM.yaml',
            expectedVersion: '2.1.0',
        },
        {
            name: 'multiKRMwithFn.yaml',
            expectedVersion: '18.0.0',
        },
    ];
    mocha_1.describe('updateContent', () => {
        tests.forEach(test => {
            mocha_1.it(`updates version in ${test.name}`, async () => {
                const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, test.name), 'utf8').replace(/\r\n/g, '\n');
                const version = new krm_blueprint_version_1.KRMBlueprintVersion({
                    path: test.name,
                    changelogEntry: '',
                    version: test.expectedVersion,
                    packageName: '',
                });
                const newContent = version.updateContent(oldContent);
                snapshot(newContent);
            });
        });
    });
});
//# sourceMappingURL=krm-blueprint-version.js.map