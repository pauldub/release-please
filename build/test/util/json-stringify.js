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
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const json_stringify_1 = require("../../src/util/json-stringify");
mocha_1.describe('json-stringify', () => {
    mocha_1.it('should respect the indentation (1/3)', () => {
        const input = JSON.stringify({ name: 'release-please', version: '1.2.3' }, undefined, 2);
        chai_1.expect(json_stringify_1.jsonStringify(JSON.parse(input), input)).to.equal(input);
    });
    mocha_1.it('should respect the indentation (2/3)', () => {
        const input = JSON.stringify({ name: 'release-please', version: '1.2.3' }, undefined, '\t');
        chai_1.expect(json_stringify_1.jsonStringify(JSON.parse(input), input)).to.equal(input);
    });
    mocha_1.it('should respect the indentation (3/3)', () => {
        const input = JSON.stringify({ name: 'release-please', version: '1.2.3' });
        chai_1.expect(json_stringify_1.jsonStringify(JSON.parse(input), input)).to.equal(input);
    });
    mocha_1.it('it should look like the original content as much as possible', () => {
        const input = `            \n\r${JSON.stringify({ name: 'release-please', version: '1.2.3' }, undefined, 3)}    \r            \n`;
        chai_1.expect(json_stringify_1.jsonStringify(JSON.parse(input), input)).to.equal(input);
    });
});
//# sourceMappingURL=json-stringify.js.map