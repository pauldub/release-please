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
exports.Python = void 0;
const chalk = require("chalk");
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// Python specific.
const setup_py_1 = require("../updaters/python/setup-py");
const setup_cfg_1 = require("../updaters/python/setup-cfg");
const python_file_with_version_1 = require("../updaters/python/python-file-with-version");
const pyproject_toml_1 = require("../updaters/python/pyproject-toml");
const logger_1 = require("../util/logger");
const CHANGELOG_SECTIONS = [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'deps', section: 'Dependencies' },
    { type: 'revert', section: 'Reverts' },
    { type: 'docs', section: 'Documentation' },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'chore', section: 'Miscellaneous Chores', hidden: true },
    { type: 'refactor', section: 'Code Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'build', section: 'Build System', hidden: true },
    { type: 'ci', section: 'Continuous Integration', hidden: true },
];
class Python extends release_pr_1.ReleasePR {
    constructor(options) {
        var _a;
        super(options);
        this.enableSimplePrereleaseParsing = true;
        this.changelogSections = (_a = options.changelogSections) !== null && _a !== void 0 ? _a : CHANGELOG_SECTIONS;
    }
    async buildUpdates(changelogEntry, candidate, packageName) {
        var _a;
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        updates.push(new setup_cfg_1.SetupCfg({
            path: this.addPath('setup.cfg'),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        updates.push(new setup_py_1.SetupPy({
            path: this.addPath('setup.py'),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        const parsedPyProject = await this.getPyProject();
        const pyProject = (parsedPyProject === null || parsedPyProject === void 0 ? void 0 : parsedPyProject.project) || ((_a = parsedPyProject === null || parsedPyProject === void 0 ? void 0 : parsedPyProject.tool) === null || _a === void 0 ? void 0 : _a.poetry);
        if (pyProject) {
            updates.push(new pyproject_toml_1.PyProjectToml({
                path: this.addPath('pyproject.toml'),
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
            if (pyProject.name) {
                updates.push(new python_file_with_version_1.PythonFileWithVersion({
                    path: this.addPath(`${pyProject.name}/__init__.py`),
                    changelogEntry,
                    version: candidate.version,
                    packageName: packageName.name,
                }));
            }
        }
        else {
            logger_1.logger.warn(parsedPyProject
                ? 'invalid pyproject.toml'
                : `file ${chalk.green('pyproject.toml')} did not exist`);
        }
        // There should be only one version.py, but foreach in case that is incorrect
        const versionPyFilesSearch = this.gh.findFilesByFilename('version.py', this.path);
        const versionPyFiles = await versionPyFilesSearch;
        versionPyFiles.forEach(path => {
            updates.push(new python_file_with_version_1.PythonFileWithVersion({
                path: this.addPath(path),
                changelogEntry,
                version: candidate.version,
                packageName: packageName.name,
            }));
        });
        return updates;
    }
    async getPyProject() {
        let content;
        try {
            content = await this.gh.getFileContents('pyproject.toml');
        }
        catch (e) {
            return null;
        }
        return pyproject_toml_1.parsePyProject(content.parsedContent);
    }
    defaultInitialVersion() {
        return '0.1.0';
    }
}
exports.Python = Python;
//# sourceMappingURL=python.js.map