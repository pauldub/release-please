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
exports.postOrder = void 0;
const semver = require("semver");
const conventional_commits_1 = require("../conventional-commits");
const changelog_1 = require("../updaters/changelog");
const cargo_lock_1 = require("../updaters/rust/cargo-lock");
const cargo_toml_1 = require("../updaters/rust/cargo-toml");
const common_1 = require("../updaters/rust/common");
const checkpoint_1 = require("../util/checkpoint");
const plugin_1 = require("./plugin");
class CargoWorkspaceDependencyUpdates extends plugin_1.ManifestPlugin {
    async getWorkspaceManifest() {
        const content = await this.gh.getFileContents('Cargo.toml');
        return common_1.parseCargoManifest(content.parsedContent);
    }
    async run(newManifestVersions, pkgsWithPRData) {
        const workspaceManifest = await this.getWorkspaceManifest();
        if (!workspaceManifest.workspace) {
            throw new Error("cargo-workspace plugin used, but top-level Cargo.toml isn't a cargo workspace");
        }
        if (!workspaceManifest.workspace.members) {
            throw new Error('cargo-workspace plugin used, but top-level Cargo.toml has no members');
        }
        const crateInfos = await this.getAllCrateInfos(workspaceManifest.workspace.members, pkgsWithPRData);
        const crateInfoMap = new Map(crateInfos.map(crate => [crate.name, crate]));
        const crateGraph = buildCrateGraph(crateInfoMap);
        const order = postOrder(crateGraph);
        const orderedCrates = order.map(name => crateInfoMap.get(name));
        const versions = new Map();
        for (const data of pkgsWithPRData) {
            if (data.config.releaseType !== 'rust' || data.config.path === '.') {
                continue;
            }
            versions.set(data.config.packageName, data.prData.version);
        }
        // Try to upgrade /all/ packages, even those release-please did not bump
        for (const crate of orderedCrates) {
            // This should update all the dependencies that have been bumped by release-please
            const dependencyUpdates = new cargo_toml_1.CargoToml({
                path: crate.manifestPath,
                changelogEntry: 'updating dependencies',
                version: 'unused',
                versions,
                packageName: 'unused',
            });
            let newContent = dependencyUpdates.updateContent(crate.manifestContent);
            if (newContent === crate.manifestContent) {
                // guess that package didn't depend on any of the bumped packages
                continue;
            }
            let updatedManifest = {
                content: newContent,
                mode: '100644',
            };
            if (crate.manifestPkg) {
                // package was already bumped by release-please, just update the change
                // to also include dependency updates.
                crate.manifestPkg.prData.changes.set(crate.manifestPath, updatedManifest);
                await this.setChangelogEntry(crate.manifestPkg.config, crate.manifestPkg.prData.changes, crate.manifestContent, updatedManifest.content // bug if undefined
                );
            }
            else {
                // package was not bumped by release-please, but let's bump it ourselves,
                // because one of its dependencies was upgraded.
                let version;
                const patch = semver.inc(crate.version, 'patch');
                if (patch === null) {
                    this.log(`Don't know how to patch ${crate.path}'s version(${crate.version})`, checkpoint_1.CheckpointType.Failure);
                    version = crate.version;
                }
                else {
                    version = patch;
                }
                // we need to reprocess its Cargo manifest to bump its own version
                versions.set(crate.name, version);
                newContent = dependencyUpdates.updateContent(crate.manifestContent);
                updatedManifest = {
                    content: newContent,
                    mode: '100644',
                };
                const changes = new Map([[crate.manifestPath, updatedManifest]]);
                newManifestVersions.set(crate.path, version);
                const manifestPkg = {
                    config: {
                        releaseType: 'rust',
                        packageName: crate.name,
                        path: crate.path,
                    },
                    prData: {
                        changes,
                        version,
                    },
                };
                pkgsWithPRData.push(manifestPkg);
                await this.setChangelogEntry(manifestPkg.config, manifestPkg.prData.changes, crate.manifestContent, updatedManifest.content // bug if undefined
                );
            }
        }
        // Upgrade package.lock
        {
            const lockfilePath = 'Cargo.lock';
            const dependencyUpdates = new cargo_lock_1.CargoLock({
                path: lockfilePath,
                changelogEntry: 'updating cargo lockfile',
                version: 'unused',
                versions,
                packageName: 'unused',
            });
            const oldContent = (await this.gh.getFileContents(lockfilePath))
                .parsedContent;
            const newContent = dependencyUpdates.updateContent(oldContent);
            if (newContent !== oldContent) {
                const changes = new Map([
                    [
                        lockfilePath,
                        {
                            content: newContent,
                            mode: '100644',
                        },
                    ],
                ]);
                pkgsWithPRData.push({
                    config: {
                        path: '.',
                        packageName: 'cargo workspace',
                        releaseType: 'rust',
                    },
                    prData: {
                        changes,
                        version: 'lockfile maintenance',
                    },
                });
            }
        }
        return [newManifestVersions, pkgsWithPRData];
    }
    async setChangelogEntry(config, changes, originalManifestContent, updatedManifestContent) {
        var _a, _b, _c, _d, _e, _f;
        const originalManifest = common_1.parseCargoManifest(originalManifestContent);
        const updatedManifest = common_1.parseCargoManifest(updatedManifestContent);
        const depUpdateNotes = this.getChangelogDepsNotes(originalManifest, updatedManifest);
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
        let tagPrefix = config.packageName;
        tagPrefix += '-v';
        const originalVersion = (_b = (_a = originalManifest.package) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '?';
        const updatedVersion = (_d = (_c = updatedManifest.package) === null || _c === void 0 ? void 0 : _c.version) !== null && _d !== void 0 ? _d : '?';
        let changelogEntry = await cc.generateChangelogEntry({
            version: updatedVersion,
            currentTag: tagPrefix + updatedVersion,
            previousTag: tagPrefix + originalVersion,
        });
        changelogEntry += depUpdateNotes;
        let updatedChangelog;
        let changelogPath = (_e = config.changelogPath) !== null && _e !== void 0 ? _e : 'CHANGELOG.md';
        if (config.path !== '.') {
            changelogPath = `${config.path}/${changelogPath}`;
        }
        const exChangelog = (_f = changes.get(changelogPath)) === null || _f === void 0 ? void 0 : _f.content;
        if (exChangelog) {
            updatedChangelog = this.updateChangelogEntry(exChangelog, changelogEntry, updatedManifest);
        }
        else {
            updatedChangelog = await this.newChangelogEntry(changelogEntry, changelogPath, updatedManifest);
        }
        if (updatedChangelog) {
            changes.set(changelogPath, {
                content: updatedChangelog,
                mode: '100644',
            });
        }
    }
    getChangelogDepsNotes(originalManifest, updatedManifest) {
        var _a;
        let depUpdateNotes = '';
        const depTypes = [
            'dependencies',
            'dev-dependencies',
            'build-dependencies',
        ];
        const depVer = (s) => {
            if (s === undefined) {
                return undefined;
            }
            if (typeof s === 'string') {
                return s;
            }
            else {
                return s.version;
            }
        };
        const getDepMap = (cargoDeps) => {
            const result = {};
            for (const [key, val] of Object.entries(cargoDeps)) {
                const ver = depVer(val);
                if (ver) {
                    result[key] = ver;
                }
            }
            return result;
        };
        const updates = new Map();
        for (const depType of depTypes) {
            const depUpdates = [];
            const pkgDepTypes = updatedManifest[depType];
            if (pkgDepTypes === undefined) {
                continue;
            }
            for (const [depName, currentDepVer] of Object.entries(getDepMap(pkgDepTypes))) {
                const origDepVer = depVer((_a = originalManifest[depType]) === null || _a === void 0 ? void 0 : _a[depName]);
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
    updateChangelogEntry(exChangelog, changelogEntry, updatedManifest) {
        var _a, _b, _c, _d;
        const pkgVersion = (_b = (_a = updatedManifest.package) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '?';
        const pkgName = (_d = (_c = updatedManifest.package) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : '?';
        changelogEntry = changelogEntry.replace(new RegExp(`^###? \\[${pkgVersion}\\].*### Dependencies`, 's'), '### Dependencies');
        const match = exChangelog.match(new RegExp(`(?<before>^.*?###? \\[${pkgVersion}\\].*?\n)(?<after>###? [0-9[].*)`, 's'));
        if (!match) {
            this.log(`Appending update notes to end of changelog for ${pkgName}`, checkpoint_1.CheckpointType.Failure);
            changelogEntry = `${exChangelog}\n\n\n${changelogEntry}`;
        }
        else {
            const { before, after } = match.groups;
            changelogEntry = `${before.trim()}\n\n\n${changelogEntry}\n\n${after.trim()}`;
        }
        return changelogEntry;
    }
    async newChangelogEntry(changelogEntry, changelogPath, updatedManifest) {
        var _a, _b, _c, _d;
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
            version: (_b = (_a = updatedManifest.package) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '?',
            packageName: (_d = (_c = updatedManifest.package) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : '?',
        });
        return changelogUpdater.updateContent(changelog);
    }
    async getAllCrateInfos(members, pkgsWithPRData) {
        var _a, _b, _c, _d;
        const manifests = [];
        for (const pkgPath of members) {
            const manifestPath = `${pkgPath}/Cargo.toml`;
            const manifestPkg = pkgsWithPRData.find(pkg => pkg.config.path === pkgPath);
            // original contents of the manifest for the target package
            const manifestContent = (_b = (_a = manifestPkg === null || manifestPkg === void 0 ? void 0 : manifestPkg.prData.changes.get(manifestPath)) === null || _a === void 0 ? void 0 : _a.content) !== null && _b !== void 0 ? _b : (await this.gh.getFileContents(manifestPath)).parsedContent;
            const manifest = await common_1.parseCargoManifest(manifestContent);
            const pkgName = (_c = manifest.package) === null || _c === void 0 ? void 0 : _c.name;
            if (!pkgName) {
                throw new Error(`package manifest at ${manifestPath} is missing [package.name]`);
            }
            const version = (_d = manifest.package) === null || _d === void 0 ? void 0 : _d.version;
            if (!version) {
                throw new Error(`package manifest at ${manifestPath} is missing [package.version]`);
            }
            manifests.push({
                path: pkgPath,
                name: pkgName,
                version,
                manifest,
                manifestContent,
                manifestPath,
                manifestPkg,
            });
        }
        return manifests;
    }
}
exports.default = CargoWorkspaceDependencyUpdates;
function buildCrateGraph(crateInfoMap) {
    var _a, _b, _c;
    const graph = new Map();
    for (const crate of crateInfoMap.values()) {
        const allDeps = Object.keys({
            ...((_a = crate.manifest.dependencies) !== null && _a !== void 0 ? _a : {}),
            ...((_b = crate.manifest['dev-dependencies']) !== null && _b !== void 0 ? _b : {}),
            ...((_c = crate.manifest['build-dependencies']) !== null && _c !== void 0 ? _c : {}),
        });
        console.log({ allDeps });
        const workspaceDeps = allDeps.filter(dep => crateInfoMap.has(dep));
        graph.set(crate.name, {
            name: crate.name,
            deps: workspaceDeps,
        });
    }
    return graph;
}
/**
 * Given a list of graph nodes that form a DAG, returns the node names in
 * post-order (reverse depth-first), suitable for dependency updates and bumping.
 */
function postOrder(graph) {
    const result = [];
    const resultSet = new Set();
    // we're iterating the `Map` in insertion order (as per ECMA262), but
    // that does not reflect any particular traversal of the graph, so we
    // visit all nodes, opportunistically short-circuiting leafs when we've
    // already visited them.
    for (const node of graph.values()) {
        visitPostOrder(graph, node, result, resultSet, []);
    }
    return result;
}
exports.postOrder = postOrder;
function visitPostOrder(graph, node, result, resultSet, path) {
    if (resultSet.has(node.name)) {
        return;
    }
    if (path.indexOf(node.name) !== -1) {
        throw new Error(`found cycle in dependency graph: ${path.join(' -> ')} -> ${node.name}`);
    }
    {
        const nextPath = [...path, node.name];
        for (const depName of node.deps) {
            const dep = graph.get(depName);
            if (!dep) {
                throw new Error(`dependency not found in graph: ${depName}`);
            }
            visitPostOrder(graph, dep, result, resultSet, nextPath);
        }
    }
    if (!resultSet.has(node.name)) {
        resultSet.add(node.name);
        result.push(node.name);
    }
}
//# sourceMappingURL=cargo-workspace.js.map