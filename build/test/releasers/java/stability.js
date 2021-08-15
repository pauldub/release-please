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
const stability_1 = require("../../../src/releasers/java/stability");
mocha_1.describe('isStableArtifact', () => {
    mocha_1.it('should return true for a bom artifact', () => {
        const isStable = stability_1.isStableArtifact('google-cloud-vision-bom');
        chai_1.expect(isStable).to.be.true;
    });
    mocha_1.it('should return true for a cloud artifact', () => {
        const isStable = stability_1.isStableArtifact('google-cloud-vision');
        chai_1.expect(isStable).to.be.true;
    });
    mocha_1.it('should return true for a stable grpc artifact', () => {
        const isStable = stability_1.isStableArtifact('grpc-google-cloud-vision-v1');
        chai_1.expect(isStable).to.be.true;
    });
    mocha_1.it('should return false for a beta grpc artifact', () => {
        const isStable = stability_1.isStableArtifact('grpc-google-cloud-vision-v1beta');
        chai_1.expect(isStable).to.be.false;
    });
    mocha_1.it('should be true for a stable proto artifact', () => {
        const isStable = stability_1.isStableArtifact('proto-google-cloud-vision-v3');
        chai_1.expect(isStable).to.be.true;
    });
    mocha_1.it('should be false for a beta proto artifact', () => {
        const isStable = stability_1.isStableArtifact('proto-google-cloud-vision-v3beta1');
        chai_1.expect(isStable).to.be.false;
    });
    mocha_1.it('should ignore versions in the middle', () => {
        const isStable = stability_1.isStableArtifact('proto-google-cloud-v4foo-v3');
        chai_1.expect(isStable).to.be.true;
    });
});
//# sourceMappingURL=stability.js.map