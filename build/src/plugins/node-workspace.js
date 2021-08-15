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
const semver = require("semver");
const cu = require("@lerna/collect-updates");
const package_1 = require("@lerna/package");
const package_graph_1 = require("@lerna/package-graph");
const run_topologically_1 = require("@lerna/run-topologically");
const plugin_1 = require("./plugin");
const json_stringify_1 = require("../util/json-stringify");
const checkpoint_1 = require("../util/checkpoint");
const constants_1 = require("../constants");
const conventional_commits_1 = require("../conventional-commits");
const changelog_1 = require("../updaters/changelog");
class Package extends package_1.Package {
    constructor(rawContent, location, pkg) {
        super(pkg !== null && pkg !== void 0 ? pkg : JSON.parse(rawContent), location);
        this.rawContent = rawContent;
    }
    clone() {
        return new Package(this.rawContent, this.location, this.toJSON());
    }
}
class NodeWorkspaceDependencyUpdates extends plugin_1.ManifestPlugin {
    // package.json contents already updated by the node releasers.
    filterPackages(pkgsWithPRData) {
        const pathPkgs = new Map();
        for (const pkg of pkgsWithPRData) {
            if (pkg.config.releaseType === 'node' && pkg.config.path !== '.') {
                for (const [path, fileData] of pkg.prData.changes) {
                    if (path === `${pkg.config.path}/package.json`) {
                        this.log(`found ${path} in changes`, checkpoint_1.CheckpointType.Success);
                        pathPkgs.set(path, fileData.content);
                    }
                }
            }
        }
        return pathPkgs;
    }
    // all packages' package.json content - both updated by this run as well as
    // those that did not update (no user facing commits).
    async getAllWorkspacePackages(rpUpdatedPkgs) {
        const nodePkgs = new Map();
        for (const pkg of this.config.parsedPackages) {
            if (pkg.releaseType !== 'node' || pkg.path === '.') {
                continue;
            }
            const path = `${pkg.path}/package.json`;
            let contents;
            const alreadyUpdated = rpUpdatedPkgs.get(path);
            if (alreadyUpdated) {
                contents = alreadyUpdated;
            }
            else {
                const { parsedContent } = await this.gh.getFileContents(path);
                contents = parsedContent;
            }
            this.log(`loaded ${path} from ${alreadyUpdated ? 'existing changes' : 'github'}`, checkpoint_1.CheckpointType.Success);
            nodePkgs.set(path, new Package(contents, path));
        }
        return nodePkgs;
    }
    async runLernaVersion(rpUpdatedPkgs, allPkgs) {
        // Build the graph of all the packages: similar to https://git.io/Jqf1v
        const packageGraph = new package_graph_1.PackageGraph(
        // use pkg.clone() which does a shallow copy of the internal data storage
        // so we can preserve the original allPkgs for version diffing later.
        [...allPkgs.values()].map(pkg => pkg.clone()), 'allDependencies');
        // release-please already did the work of @lerna/collectUpdates (identifying
        // which packages need version bumps based on conventional commits). We use
        // that as our `isCandidate` callback in @lerna/collectUpdates.collectPackages.
        // similar to https://git.io/JqUOB
        // `collectPackages` includes "localDependents" of our release-please updated
        // packages as they need to be patch bumped.
        const isCandidate = (node) => rpUpdatedPkgs.has(node.location);
        const updatesWithDependents = cu.collectPackages(packageGraph, {
            isCandidate,
            onInclude: name => this.log(`${name} collected for update (dependency-only = ${!isCandidate(packageGraph.get(name))})`, checkpoint_1.CheckpointType.Success),
            excludeDependents: false,
        });
        // our implementation of producing a Map<pkgName, newVersion> similar to
        // `this.updatesVersions` which is used to set updated package
        // (https://git.io/JqfD7) and dependency (https://git.io/JqU3q) versions
        //
        // `lerna version` accomplishes this with:
        // `getVersionsForUpdates` (https://git.io/JqfyI)
        //   -> `getVersion` + `reduceVersions` (https://git.io/JqfDI)
        const updatesVersions = new Map();
        const invalidVersions = new Set();
        for (const node of updatesWithDependents) {
            let version;
            let source;
            if (rpUpdatedPkgs.has(node.location)) {
                version = node.version;
                source = constants_1.RELEASE_PLEASE;
            }
            else {
                // must be a dependent, check for releaseAs config otherwise default
                // to a patch bump.
                const pkgConfig = this.config.parsedPackages.find(p => {
                    const pkgPath = `${p.path}/package.json`;
                    const match = pkgPath === node.location;
                    this.log(`Checking node "${node.location}" against parsed package "${pkgPath}"`, match ? checkpoint_1.CheckpointType.Success : checkpoint_1.CheckpointType.Failure);
                    return match;
                });
                if (!pkgConfig) {
                    this.log(`No pkgConfig found for ${node.location}`, checkpoint_1.CheckpointType.Failure);
                }
                else if (!pkgConfig.releaseAs) {
                    this.log(`No pkgConfig.releaseAs for ${node.location}`, checkpoint_1.CheckpointType.Failure);
                }
                if (pkgConfig === null || pkgConfig === void 0 ? void 0 : pkgConfig.releaseAs) {
                    version = pkgConfig.releaseAs;
                    source = 'release-as configuration';
                }
                else {
                    const patch = semver.inc(node.version, 'patch');
                    if (patch === null) {
                        this.log(`Don't know how to patch ${node.name}'s version(${node.version})`, checkpoint_1.CheckpointType.Failure);
                        invalidVersions.add(node.name);
                        version = node.version;
                        source = 'failed to patch bump';
                    }
                    else {
                        version = patch;
                        source = 'dependency bump';
                    }
                }
            }
            this.log(`setting ${node.location} to ${version} from ${source}`, checkpoint_1.CheckpointType.Success);
            updatesVersions.set(node.name, version);
        }
        // our implementation of a subset of `updatePackageVersions` to produce a
        // callback for updating versions and dependencies (https://git.io/Jqfyu)
        const runner = async (pkg) => {
            pkg.set('version', updatesVersions.get(pkg.name));
            const graphPkg = packageGraph.get(pkg.name);
            for (const [depName, resolved] of graphPkg.localDependencies) {
                const depVersion = updatesVersions.get(depName);
                if (depVersion && resolved.type !== 'directory') {
                    pkg.updateLocalDependency(resolved, depVersion, '^');
                    this.log(`${pkg.name}.${depName} updated to ^${depVersion}`, checkpoint_1.CheckpointType.Success);
                }
            }
            return pkg;
        };
        // https://git.io/Jqfyp
        const allUpdated = (await run_topologically_1.runTopologically(updatesWithDependents.map(node => node.pkg), runner, {
            graphType: 'allDependencies',
            concurrency: 1,
            rejectCycles: false,
        }));
        return new Map(allUpdated.map(p => [p.location, p]));
    }
    async updatePkgsWithPRData(pkgsWithPRData, newManifestVersions, allUpdated, allOrigPkgs) {
        // already had version bumped by release-please, may have also had
        // dependency version bumps as well
        for (const data of pkgsWithPRData) {
            if (data.config.releaseType !== 'node' || data.config.path === '.') {
                continue;
            }
            const filePath = `${data.config.path}/package.json`;
            const updated = allUpdated.get(filePath); // bug if not defined
            data.prData.changes.set(filePath, {
                content: json_stringify_1.jsonStringify(updated.toJSON(), updated.rawContent),
                mode: '100644',
            });
            await this.setChangelogEntry(data.config, data.prData.changes, updated, allOrigPkgs.get(filePath).toJSON() // bug if undefined.
            );
            allUpdated.delete(filePath);
        }
        // non-release-please updated packages that have updates solely because
        // dependency versions incremented.
        for (const [filePath, updated] of allUpdated) {
            const pkg = this.config.parsedPackages.find(p => `${p.path}/package.json` === filePath); // bug if undefined.
            pkg.packageName = updated.name;
            const content = json_stringify_1.jsonStringify(updated.toJSON(), updated.rawContent);
            const changes = new Map([[filePath, { content, mode: '100644' }]]);
            await this.setChangelogEntry(pkg, changes, updated, allOrigPkgs.get(filePath) // bug if undefined.
            );
            pkgsWithPRData.push({
                config: pkg,
                prData: {
                    version: updated.version,
                    changes,
                },
            });
            newManifestVersions.set(filePath.replace(/\/package.json$/, ''), updated.version);
        }
    }
    getChangelogDepsNotes(pkg, origPkgJson) {
        var _a;
        let depUpdateNotes = '';
        const depTypes = [
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
        ];
        const updates = new Map();
        for (const depType of depTypes) {
            const depUpdates = [];
            const pkgDepTypes = pkg[depType];
            if (pkgDepTypes === undefined) {
                continue;
            }
            for (const [depName, currentDepVer] of Object.entries(pkgDepTypes)) {
                const origDepVer = (_a = origPkgJson[depType]) === null || _a === void 0 ? void 0 : _a[depName];
                if (currentDepVer !== origDepVer) {
                    depUpdates.push(`\n    * ${depName} bumped from ${origDepVer} to ${currentDepVer}`);
                }
            }
            if (depUpdates.length > 0) {
                updates.set(depType, depUpdates);
            }
        }
        for (const [dt, notes] of updates) {
            depUpdateNotes += `\n  * ${dt}`;
            for (const note of notes) {
                depUpdateNotes += note;
            }
        }
        return depUpdateNotes;
    }
    updateChangelogEntry(exChangelog, changelogEntry, pkg) {
        changelogEntry = changelogEntry.replace(new RegExp(`^###? \\[${pkg.version}\\].*### Dependencies`, 's'), '### Dependencies');
        const match = exChangelog.match(new RegExp(`(?<before>^.*?###? \\[${pkg.version}\\].*?\n)(?<after>###? [0-9[].*)`, 's'));
        if (!match) {
            this.log(`Appending update notes to end of changelog for ${pkg.name}`, checkpoint_1.CheckpointType.Failure);
            changelogEntry = `${exChangelog}\n\n\n${changelogEntry}`;
        }
        else {
            const { before, after } = match.groups;
            changelogEntry = `${before.trim()}\n\n\n${changelogEntry}\n\n${after.trim()}`;
        }
        return changelogEntry;
    }
    async newChangelogEntry(changelogEntry, changelogPath, pkg) {
        let changelog;
        try {
            changelog = (await this.gh.getFileContents(changelogPath)).parsedContent;
        }
        catch (e) {
            if (e.status !== 404) {
                this.log(`Failed to retrieve ${changelogPath}: ${e}`, checkpoint_1.CheckpointType.Failure);
                return '';
            }
            else {
                this.log(`Creating a new changelog at ${changelogPath}`, checkpoint_1.CheckpointType.Success);
            }
        }
        const changelogUpdater = new changelog_1.Changelog({
            path: changelogPath,
            changelogEntry,
            version: pkg.version,
            packageName: pkg.name,
        });
        return changelogUpdater.updateContent(changelog);
    }
    async setChangelogEntry(config, changes, pkg, origPkgJson) {
        var _a, _b, _c;
        const depUpdateNotes = this.getChangelogDepsNotes(pkg, origPkgJson);
        if (!depUpdateNotes) {
            return;
        }
        const cc = new conventional_commits_1.ConventionalCommits({
            changelogSections: [{ type: 'deps', section: 'Dependencies' }],
            commits: [
                {
                    sha: '',
                    message: 'deps: The following workspace dependencies were updated',
                    files: [],
                },
            ],
            owner: this.gh.owner,
            repository: this.gh.repo,
            bumpMinorPreMajor: config.bumpMinorPreMajor,
        });
        let tagPrefix = ((_a = config.packageName) === null || _a === void 0 ? void 0 : _a.match(/^@[\w-]+\//)) ? config.packageName.split('/')[1]
            : config.packageName;
        tagPrefix += '-v';
        let changelogEntry = await cc.generateChangelogEntry({
            version: pkg.version,
            currentTag: tagPrefix + pkg.version,
            previousTag: tagPrefix + origPkgJson.version,
        });
        changelogEntry += depUpdateNotes;
        let updatedChangelog;
        let changelogPath = (_b = config.changelogPath) !== null && _b !== void 0 ? _b : 'CHANGELOG.md';
        if (config.path !== '.') {
            changelogPath = `${config.path}/${changelogPath}`;
        }
        const exChangelog = (_c = changes.get(changelogPath)) === null || _c === void 0 ? void 0 : _c.content;
        if (exChangelog) {
            updatedChangelog = this.updateChangelogEntry(exChangelog, changelogEntry, pkg);
        }
        else {
            updatedChangelog = await this.newChangelogEntry(changelogEntry, changelogPath, pkg);
        }
        if (updatedChangelog) {
            changes.set(changelogPath, {
                content: updatedChangelog,
                mode: '100644',
            });
        }
    }
    /**
     * Update node monorepo workspace package dependencies.
     * Inspired by and using a subset of the logic from `lerna version`
     */
    async run(newManifestVersions, pkgsWithPRData) {
        const rpUpdatedPkgs = this.filterPackages(pkgsWithPRData);
        const allPkgs = await this.getAllWorkspacePackages(rpUpdatedPkgs);
        const allUpdated = await this.runLernaVersion(rpUpdatedPkgs, allPkgs);
        await this.updatePkgsWithPRData(pkgsWithPRData, newManifestVersions, allUpdated, allPkgs);
        return [newManifestVersions, pkgsWithPRData];
    }
}
exports.default = NodeWorkspaceDependencyUpdates;
//# sourceMappingURL=node-workspace.js.map