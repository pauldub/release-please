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
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const releasers_1 = require("../../src/releasers");
mocha_1.describe('getReleaserTypes', () => {
    mocha_1.it('gets types for all releasers', async () => {
        const releasers = releasers_1.getReleasers();
        chai_1.expect(Object.keys(releasers)).to.eql(releasers_1.getReleaserTypes());
    });
});
mocha_1.describe('getReleaserNames', () => {
    mocha_1.it('gets types for all releasers', async () => {
        const releasers = releasers_1.getReleasers();
        chai_1.expect(Object.keys(releasers)).to.eql(releasers_1.getReleaserNames());
    });
});
//# sourceMappingURL=index.js.map