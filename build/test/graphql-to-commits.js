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
const github_1 = require("../src/github");
const graphql_to_commits_1 = require("../src/graphql-to-commits");
const fixturesPath = './test/fixtures';
const github = new github_1.GitHub({ owner: 'fake', repo: 'fake' });
mocha_1.describe('graphqlToCommits', () => {
    mocha_1.it('converts raw graphql response into Commits object for php-yoshi', async () => {
        const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'commits-yoshi-php-monorepo.json'), 'utf8'));
        const commits = await graphql_to_commits_1.graphqlToCommits(github, graphql);
        snapshot(commits);
    });
    mocha_1.it('converts raw graphql response into Commits object for php', async () => {
        const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'commits-php.json'), 'utf8'));
        const commits = await graphql_to_commits_1.graphqlToCommits(github, graphql);
        snapshot(commits);
    });
    mocha_1.it('uses label for conventional commit prefix, if no prefix provided', async () => {
        const graphql = JSON.parse(fs_1.readFileSync(path_1.resolve(fixturesPath, 'commits-with-labels.json'), 'utf8'));
        const commits = await graphql_to_commits_1.graphqlToCommits(github, graphql);
        snapshot(commits);
    });
});
//# sourceMappingURL=graphql-to-commits.js.map