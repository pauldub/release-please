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
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const version_1 = require("../../../src/releasers/java/version");
mocha_1.describe('Version', () => {
    mocha_1.describe('parse', () => {
        mocha_1.it('can read a plain semver', async () => {
            const input = '1.23.45';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('');
            chai_1.expect(version.snapshot).to.equal(false);
        });
        mocha_1.it('can read a SNAPSHOT version', async () => {
            const input = '1.23.45-SNAPSHOT';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('');
            chai_1.expect(version.snapshot).to.equal(true);
        });
        mocha_1.it('can read a beta version', async () => {
            const input = '1.23.45-beta';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('-beta');
            chai_1.expect(version.snapshot).to.equal(false);
        });
        mocha_1.it('can read a beta SNAPSHOT version', async () => {
            const input = '1.23.45-beta-SNAPSHOT';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('-beta');
            chai_1.expect(version.snapshot).to.equal(true);
        });
        mocha_1.it('can read an lts version', async () => {
            const input = '1.23.45-sp.1';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('');
            chai_1.expect(version.lts).to.equal(1);
            chai_1.expect(version.snapshot).to.equal(false);
        });
        mocha_1.it('can read an lts beta version', async () => {
            const input = '1.23.45-beta-sp.1';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('-beta');
            chai_1.expect(version.lts).to.equal(1);
            chai_1.expect(version.snapshot).to.equal(false);
        });
        mocha_1.it('can read an lts snapshot version', async () => {
            const input = '1.23.45-sp.1-SNAPSHOT';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('');
            chai_1.expect(version.lts).to.equal(1);
            chai_1.expect(version.snapshot).to.equal(true);
        });
        mocha_1.it('can read an lts beta snapshot version', async () => {
            const input = '1.23.45-beta-sp.1-SNAPSHOT';
            const version = version_1.Version.parse(input);
            chai_1.expect(version.major).to.equal(1);
            chai_1.expect(version.minor).to.equal(23);
            chai_1.expect(version.patch).to.equal(45);
            chai_1.expect(version.extra).to.equal('-beta');
            chai_1.expect(version.lts).to.equal(1);
            chai_1.expect(version.snapshot).to.equal(true);
        });
    });
    mocha_1.describe('bump', () => {
        let version;
        mocha_1.describe('for snapshot version', () => {
            mocha_1.beforeEach(() => {
                version = version_1.Version.parse('1.23.45-beta-SNAPSHOT');
            });
            mocha_1.it('should handle major bumps', async () => {
                version.bump('major');
                chai_1.expect(version.major).to.equal(2);
                chai_1.expect(version.minor).to.equal(0);
                chai_1.expect(version.patch).to.equal(0);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(false);
            });
            mocha_1.it('should handle minor bumps', async () => {
                version.bump('minor');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(24);
                chai_1.expect(version.patch).to.equal(0);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(false);
            });
            mocha_1.it('should handle patch bumps', async () => {
                version.bump('patch');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(46);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(false);
            });
            mocha_1.it('should handle snapshot bumps', async () => {
                version.bump('snapshot');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(46);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(true);
            });
        });
        mocha_1.describe('for non-snapshot version', () => {
            mocha_1.beforeEach(() => {
                version = version_1.Version.parse('1.23.45-beta');
            });
            mocha_1.it('should handle major bumps', async () => {
                version.bump('major');
                chai_1.expect(version.major).to.equal(2);
                chai_1.expect(version.minor).to.equal(0);
                chai_1.expect(version.patch).to.equal(0);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(false);
            });
            mocha_1.it('should handle minor bumps', async () => {
                version.bump('minor');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(24);
                chai_1.expect(version.patch).to.equal(0);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(false);
            });
            mocha_1.it('should handle patch bumps', async () => {
                version.bump('patch');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(46);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(false);
            });
            mocha_1.it('should handle snapshot bumps', async () => {
                version.bump('snapshot');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(46);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.snapshot).to.equal(true);
            });
        });
        mocha_1.describe('LTS', () => {
            mocha_1.it('should make an initial LTS bump', async () => {
                const version = version_1.Version.parse('1.23.45').bump('lts');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(45);
                chai_1.expect(version.extra).to.equal('');
                chai_1.expect(version.lts).to.equal(1);
                chai_1.expect(version.snapshot).to.equal(false);
                chai_1.expect(version.toString()).to.equal('1.23.45-sp.1');
            });
            mocha_1.it('should make an initial LTS snapshot bump', async () => {
                const version = version_1.Version.parse('1.23.45').bump('lts-snapshot');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(45);
                chai_1.expect(version.extra).to.equal('');
                chai_1.expect(version.lts).to.equal(1);
                chai_1.expect(version.snapshot).to.equal(true);
                chai_1.expect(version.toString()).to.equal('1.23.45-sp.1-SNAPSHOT');
            });
            mocha_1.it('should make an initial LTS bump on a SNAPSHOT', async () => {
                const version = version_1.Version.parse('1.23.45-SNAPSHOT').bump('lts');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(45);
                chai_1.expect(version.extra).to.equal('');
                chai_1.expect(version.lts).to.equal(1);
                chai_1.expect(version.snapshot).to.equal(false);
                chai_1.expect(version.toString()).to.equal('1.23.45-sp.1');
            });
            mocha_1.it('should make an initial LTS bump on beta version', async () => {
                const version = version_1.Version.parse('1.23.45-beta').bump('lts');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(45);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.lts).to.equal(1);
                chai_1.expect(version.snapshot).to.equal(false);
                chai_1.expect(version.toString()).to.equal('1.23.45-beta-sp.1');
            });
            mocha_1.it('should make a snapshot on an LTS version', async () => {
                const version = version_1.Version.parse('1.23.45-beta-sp.1').bump('lts-snapshot');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(45);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.lts).to.equal(2);
                chai_1.expect(version.snapshot).to.equal(true);
                chai_1.expect(version.toString()).to.equal('1.23.45-beta-sp.2-SNAPSHOT');
            });
            mocha_1.it('should make an LTS bump on an LTS version', async () => {
                const version = version_1.Version.parse('1.23.45-beta-sp.2-SNAPSHOT').bump('lts');
                chai_1.expect(version.major).to.equal(1);
                chai_1.expect(version.minor).to.equal(23);
                chai_1.expect(version.patch).to.equal(45);
                chai_1.expect(version.extra).to.equal('-beta');
                chai_1.expect(version.lts).to.equal(2);
                chai_1.expect(version.snapshot).to.equal(false);
                chai_1.expect(version.toString()).to.equal('1.23.45-beta-sp.2');
            });
        });
    });
});
//# sourceMappingURL=version.js.map