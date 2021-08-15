#!/usr/bin/env node
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
exports.handleError = exports.parser = void 0;
const chalk = require("chalk");
const coerce_option_1 = require("../util/coerce-option");
const factory_1 = require("../factory");
const releasers_1 = require("../releasers");
const yargs = require("yargs");
const constants_1 = require("../constants");
function releaserCommon(ya) {
    // common to ReleasePR and GitHubRelease
    ya.option('label', {
        default: 'autorelease: pending',
        describe: 'label to remove from release PR',
    });
    ya.option('release-as', {
        describe: 'override the semantically determined release version',
        type: 'string',
    });
    ya.option('bump-minor-pre-major', {
        describe: 'should we bump the semver minor prior to the first major release',
        default: false,
        type: 'boolean',
    });
    ya.option('bump-minor-for-patch-pre-major', {
        describe: 'should we bump the semver patch instead of the minor for non-breaking' +
            ' changes prior to the first major release',
        default: false,
        type: 'boolean',
    });
    ya.option('path', {
        describe: 'release from path other than root directory',
        type: 'string',
    });
    ya.option('package-name', {
        describe: 'name of package release is being minted for',
    });
    ya.option('monorepo-tags', {
        describe: 'include library name in tags and release branches',
        type: 'boolean',
        default: false,
    });
    ya.option('version-file', {
        describe: 'path to version file to update, e.g., version.rb',
    });
    ya.option('last-package-version', {
        describe: 'last version # that package was released as',
    });
    ya.option('snapshot', {
        describe: 'is it a snapshot (or pre-release) being generated?',
        type: 'boolean',
        default: false,
    });
    ya.option('pull-request-title-pattern', {
        describe: 'Title pattern to make release PR',
        type: 'string',
    });
    ya.option('changelog-path', {
        default: 'CHANGELOG.md',
        describe: 'where can the CHANGELOG be found in the project?',
    });
}
function releaseType(ya, defaultType) {
    const relTypeOptions = {
        describe: 'what type of repo is a release being created for?',
        choices: releasers_1.getReleaserTypes(),
    };
    if (defaultType) {
        relTypeOptions.default = defaultType;
    }
    ya.option('release-type', relTypeOptions);
}
function manifestOptions(ya) {
    ya.option('config-file', {
        default: 'release-please-config.json',
        describe: 'where can the config file be found in the project?',
    });
    ya.option('manifest-file', {
        default: '.release-please-manifest.json',
        describe: 'where can the manifest file be found in the project?',
    });
}
exports.parser = yargs
    .command('manifest-pr', 'create a release-PR using a manifest file', (yargs) => {
    manifestOptions(yargs);
}, (argv) => {
    factory_1.factory.runCommand('manifest-pr', argv).catch(exports.handleError);
})
    .command('manifest-release', 'create releases/tags from last release-PR using a manifest file', (yargs) => {
    manifestOptions(yargs);
}, (argv) => {
    factory_1.factory.runCommand('manifest-release', argv).catch(exports.handleError);
})
    .command('release-pr', 'create or update a PR representing the next release', 
// options unique to ReleasePR
(yargs) => {
    releaseType(yargs, 'node');
    releaserCommon(yargs);
}, (argv) => {
    factory_1.factory.runCommand('release-pr', argv).catch(exports.handleError);
})
    .command('latest-tag', 'find the sha of the latest release', 
// options unique to ReleasePR
(yargs) => {
    releaseType(yargs, 'node');
    releaserCommon(yargs);
}, (argv) => {
    factory_1.factory
        .runCommand('latest-tag', argv)
        .catch(exports.handleError)
        .then(latestTag => {
        if (latestTag) {
            console.log(latestTag);
        }
        else {
            console.log('No latest tag found.');
            process.exitCode = 1;
        }
    });
})
    .command('github-release', 'create a GitHub release from a release PR', 
// options unique to GitHubRelease
(yargs) => {
    releaseType(yargs);
    releaserCommon(yargs);
    yargs.option('draft', {
        describe: 'mark release as a draft. no tag is created but tag_name and ' +
            'target_commitish are associated with the release for future ' +
            'tag creation upon "un-drafting" the release.',
        type: 'boolean',
        default: false,
    });
}, (argv) => {
    factory_1.factory.runCommand('github-release', argv).catch(exports.handleError);
})
    .middleware(_argv => {
    const argv = _argv;
    // allow secrets to be loaded from file path
    // rather than being passed directly to the bin.
    if (argv.token)
        argv.token = coerce_option_1.coerceOption(argv.token);
    if (argv.apiUrl)
        argv.apiUrl = coerce_option_1.coerceOption(argv.apiUrl);
})
    .option('debug', {
    describe: 'print verbose errors (use only for local debugging).',
    default: false,
    type: 'boolean',
})
    // See base GitHub options (e.g. GitHubFactoryOptions)
    .option('token', { describe: 'GitHub token with repo write permissions' })
    .option('api-url', {
    describe: 'URL to use when making API requests',
    default: constants_1.GH_API_URL,
    type: 'string',
})
    .option('default-branch', {
    describe: 'The branch to open release PRs against and tag releases on',
    type: 'string',
})
    .option('fork', {
    describe: 'should the PR be created from a fork',
    type: 'boolean',
    default: false,
})
    .option('repo-url', {
    describe: 'GitHub URL to generate release for',
    demand: true,
})
    .demandCommand(1)
    .strict(true)
    .scriptName('release-please');
// The errors returned by octokit currently contain the
// request object, this contains information we don't want to
// leak. For this reason, we capture exceptions and print
// a less verbose error message (run with --debug to output
// the request object, don't do this in CI/CD).
exports.handleError = (err) => {
    var _a;
    let status = '';
    if (exports.handleError.yargsArgs === undefined) {
        throw new Error('Set handleError.yargsArgs with a yargs.Arguments instance.');
    }
    if (!exports.handleError.logger) {
        exports.handleError.logger = console;
    }
    const ya = exports.handleError.yargsArgs;
    const logger = exports.handleError.logger;
    const command = ((_a = ya === null || ya === void 0 ? void 0 : ya._) === null || _a === void 0 ? void 0 : _a.length) ? ya._[0] : '';
    if (err.status) {
        status = '' + err.status;
    }
    logger.error(chalk.red(`command ${command} failed${status ? ` with status ${status}` : ''}`));
    if (ya === null || ya === void 0 ? void 0 : ya.debug) {
        logger.error('---------');
        logger.error(err.stack);
    }
    process.exitCode = 1;
};
// Only run parser if executed with node bin, this allows
// for the parser to be easily tested:
let argv;
if (require.main === module) {
    argv = exports.parser.parse();
    exports.handleError.yargsArgs = argv;
    process.on('unhandledRejection', err => {
        exports.handleError(err);
    });
    process.on('uncaughtException', err => {
        exports.handleError(err);
    });
}
//# sourceMappingURL=release-please.js.map