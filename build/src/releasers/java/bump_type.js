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
exports.fromSemverReleaseType = exports.maxBumpType = void 0;
function maxBumpType(bumpTypes) {
    if (bumpTypes.some(bumpType => bumpType === 'major')) {
        return 'major';
    }
    if (bumpTypes.some(bumpType => bumpType === 'minor')) {
        return 'minor';
    }
    return 'patch';
}
exports.maxBumpType = maxBumpType;
function fromSemverReleaseType(releaseType) {
    switch (releaseType) {
        case 'major':
        case 'minor':
        case 'patch':
            return releaseType;
        default:
            throw Error(`unsupported release type ${releaseType}`);
    }
}
exports.fromSemverReleaseType = fromSemverReleaseType;
//# sourceMappingURL=bump_type.js.map