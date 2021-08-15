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
const cargo_toml_1 = require("../../src/updaters/rust/cargo-toml");
const chai_1 = require("chai");
const fixturesPath = './test/updaters/fixtures';
mocha_1.describe('CargoToml', () => {
    mocha_1.describe('updateContent', () => {
        mocha_1.it('refuses to update without versions', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './Cargo.toml'), 'utf8').replace(/\r\n/g, '\n');
            const cargoToml = new cargo_toml_1.CargoToml({
                path: 'Cargo.toml',
                changelogEntry: '',
                version: 'unused',
                versions: undefined,
                packageName: 'rust-test-repo',
            });
            chai_1.expect(() => {
                cargoToml.updateContent(oldContent);
            }).to.throw();
        });
        mocha_1.it('refuses to update non-package manifests', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './Cargo-workspace.toml'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            const cargoToml = new cargo_toml_1.CargoToml({
                path: 'Cargo.toml',
                changelogEntry: '',
                version: 'unused',
                versions,
                packageName: 'rust-test-repo',
            });
            chai_1.expect(() => {
                cargoToml.updateContent(oldContent);
            }).to.throw();
        });
        mocha_1.it('updates the crate version while preserving formatting', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './Cargo.toml'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            versions.set('rust-test-repo', '14.0.0');
            const cargoToml = new cargo_toml_1.CargoToml({
                path: 'Cargo.toml',
                changelogEntry: '',
                version: 'unused',
                versions,
                packageName: 'rust-test-repo',
            });
            const newContent = cargoToml.updateContent(oldContent);
            snapshot(newContent);
        });
        mocha_1.it('updates (only) path dependencies', async () => {
            const oldContent = fs_1.readFileSync(path_1.resolve(fixturesPath, './Cargo.toml'), 'utf8').replace(/\r\n/g, '\n');
            const versions = new Map();
            versions.set('normal-dep', '2.0.0');
            versions.set('dev-dep', '2.0.0');
            versions.set('build-dep', '2.0.0');
            versions.set('windows-dep', '2.0.0');
            versions.set('unix-dep', '2.0.0');
            versions.set('x86-dep', '2.0.0');
            versions.set('x86-64-dep', '2.0.0');
            versions.set('foobar-dep', '2.0.0');
            const cargoToml = new cargo_toml_1.CargoToml({
                path: 'Cargo.toml',
                changelogEntry: '',
                version: 'unused',
                versions,
                packageName: 'rust-test-repo',
            });
            const newContent = cargoToml.updateContent(oldContent);
            snapshot(newContent);
        });
    });
});
//# sourceMappingURL=cargo-toml.js.map