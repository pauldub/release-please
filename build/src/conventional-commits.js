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
exports.ConventionalCommits = void 0;
const chalk = require("chalk");
const semver = require("semver");
const logger_1 = require("./util/logger");
const parser_1 = require("@conventional-commits/parser");
const to_conventional_changelog_format_1 = require("./util/to-conventional-changelog-format");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const conventionalCommitsFilter = require('conventional-commits-filter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const conventionalChangelogWriter = require('conventional-changelog-writer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const presetFactory = require('conventional-changelog-conventionalcommits');
function getParsedCommits(commits, commitFilter = () => false) {
    const parsedCommits = [];
    for (const commit of commits) {
        try {
            for (const parsedCommit of to_conventional_changelog_format_1.default(parser_1.parser(commit.message))) {
                const commitWithHash = postProcessCommits(parsedCommit);
                if (commitFilter(parsedCommit)) {
                    continue;
                }
                commitWithHash.hash = commit.sha;
                parsedCommits.push(commitWithHash);
            }
        }
        catch (_err) {
            // Commit is not in conventional commit format, it does not
            // contribute to the CHANGELOG generation.
        }
    }
    return parsedCommits;
}
// TODO(@bcoe): now that we walk the actual AST of conventional commits
// we should be able to move post processing into
// to-conventional-changelog.ts.
function postProcessCommits(commit) {
    commit.notes.forEach(note => {
        let text = '';
        let i = 0;
        let extendedContext = false;
        for (const chunk of note.text.split(/\r?\n/)) {
            if (i > 0 && hasExtendedContext(chunk) && !extendedContext) {
                text = `${text.trim()}\n`;
                extendedContext = true;
            }
            if (chunk === '')
                break;
            else if (extendedContext) {
                text += `    ${chunk}\n`;
            }
            else {
                text += `${chunk} `;
            }
            i++;
        }
        note.text = text.trim();
    });
    return commit;
}
// If someone wishes to include additional contextual information for a
// BREAKING CHANGE using markdown, they can do so by starting the line after the initial
// breaking change description with either:
//
// 1. a fourth-level header.
// 2. a bulleted list (using either '*' or '-').
//
// BREAKING CHANGE: there were breaking changes
// #### Deleted Endpoints
// - endpoint 1
// - endpoint 2
function hasExtendedContext(line) {
    if (line.match(/^#### |^[*-] /))
        return true;
    return false;
}
class ConventionalCommits {
    constructor(options) {
        this.commits = options.commits;
        this.parsedCommits = getParsedCommits(options.commits, options.commitFilter);
        this.bumpMinorPreMajor = options.bumpMinorPreMajor || false;
        this.bumpPatchForMinorPreMajor = options.bumpPatchForMinorPreMajor || false;
        this.host = options.host || 'https://www.github.com';
        this.owner = options.owner;
        this.repository = options.repository;
        // we allow some languages (currently Ruby) to provide their own
        // template style:
        this.commitPartial = options.commitPartial;
        this.headerPartial = options.headerPartial;
        this.mainTemplate = options.mainTemplate;
        this.changelogSections = options.changelogSections;
        this.commitFilter = options.commitFilter;
    }
    async suggestBump(version) {
        const preMajor = this.bumpMinorPreMajor
            ? semver.lt(version, 'v1.0.0')
            : false;
        const bump = await this.guessReleaseType(preMajor);
        logger_1.logger.info(`release as ${chalk.green(bump.releaseType)}: ${chalk.yellow(bump.reason)}`);
        return bump;
    }
    async generateChangelogEntry(options) {
        const context = {
            host: this.host,
            owner: this.owner,
            repository: this.repository,
            version: options.version,
            previousTag: options.previousTag,
            currentTag: options.currentTag,
            linkCompare: !!options.previousTag,
        };
        // allows the sections displayed in the CHANGELOG to be configured
        // as an example, Ruby displays docs:
        const config = {};
        if (this.changelogSections) {
            config.types = this.changelogSections;
        }
        const preset = await presetFactory(config);
        preset.writerOpts.commitPartial =
            this.commitPartial || preset.writerOpts.commitPartial;
        preset.writerOpts.headerPartial =
            this.headerPartial || preset.writerOpts.headerPartial;
        preset.writerOpts.mainTemplate =
            this.mainTemplate || preset.writerOpts.mainTemplate;
        const parsed = conventionalChangelogWriter
            .parseArray(this.parsedCommits, context, preset.writerOpts)
            .trim();
        return parsed;
    }
    async guessReleaseType(preMajor) {
        const VERSIONS = ['major', 'minor', 'patch'];
        const preset = await presetFactory({ preMajor });
        const commits = conventionalCommitsFilter(this.parsedCommits);
        let result = preset.recommendedBumpOpts.whatBump(commits, preset.recommendedBumpOpts);
        if (result && result.level !== null) {
            result.releaseType = VERSIONS[result.level];
        }
        else if (result === null) {
            result = {};
        }
        // we have slightly different logic than the default of conventional commits,
        // the minor should be bumped when features are introduced for pre 1.x.x libs:
        // turn off custom logic here by setting bumpPatchForMinorPreMajor = true
        if (result.reason.indexOf(' 0 features') === -1 &&
            result.releaseType === 'patch' &&
            !this.bumpPatchForMinorPreMajor) {
            result.releaseType = 'minor';
        }
        return result;
    }
}
exports.ConventionalCommits = ConventionalCommits;
//# sourceMappingURL=conventional-commits.js.map