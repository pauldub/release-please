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
const root_composer_update_package_1 = require("../../src/updaters/root-composer-update-package");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('composer-update-package.json', () => {
    mocha_1.describe('updateContent', () => {
        mocha_1.it('update version in root composer file', async () => {
            const versions = new Map();
            versions.set('version', '0.8.0');
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './composer-update-package.json'), 'utf8').replace(/\r\n/g, '\n');
            const composer = new root_composer_update_package_1.RootComposerUpdatePackage({
                path: 'version',
                version: '0.8.0',
                changelogEntry: '',
                versions,
                packageName: '',
            });
            const newContent = composer.updateContent(oldContent);
            snapshot(newContent);
        });
    });
});
//# sourceMappingURL=root-composer-update-package.js.map