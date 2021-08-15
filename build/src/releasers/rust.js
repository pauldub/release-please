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
exports.Rust = void 0;
const release_pr_1 = require("../release-pr");
// Generic
const changelog_1 = require("../updaters/changelog");
// Cargo.toml support
const cargo_toml_1 = require("../updaters/rust/cargo-toml");
const cargo_lock_1 = require("../updaters/rust/cargo-lock");
const common_1 = require("../updaters/rust/common");
const logger_1 = require("../util/logger");
class Rust extends release_pr_1.ReleasePR {
    async buildUpdates(changelogEntry, candidate, packageName) {
        const updates = [];
        updates.push(new changelog_1.Changelog({
            path: this.addPath(this.changelogPath),
            changelogEntry,
            version: candidate.version,
            packageName: packageName.name,
        }));
        const workspaceManifest = await this.getWorkspaceManifest();
        const manifestPaths = [];
        let lockPath;
        if (this.forManifestReleaser) {
            logger_1.logger.info('working for manifest releaser, only touching package, not dependencies');
        }
        if (workspaceManifest &&
            workspaceManifest.workspace &&
            workspaceManifest.workspace.members &&
            !this.forManifestReleaser) {
            const members = workspaceManifest.workspace.members;
            logger_1.logger.info(`found workspace with ${members.length} members, upgrading all`);
            for (const member of members) {
                manifestPaths.push(`${member}/Cargo.toml`);
            }
            lockPath = 'Cargo.lock';
        }
        else {
            const manifestPath = this.addPath('Cargo.toml');
            logger_1.logger.info(`single crate found, updating ${manifestPath}`);
            manifestPaths.push(this.addPath('Cargo.toml'));
            lockPath = this.addPath('Cargo.lock');
        }
        const versions = new Map();
        versions.set(packageName.name, candidate.version);
        for (const path of manifestPaths) {
            updates.push(new cargo_toml_1.CargoToml({
                path,
                changelogEntry,
                version: 'unused',
                versions,
                packageName: packageName.name,
            }));
        }
        if ((await this.exists(lockPath)) && !this.forManifestReleaser) {
            updates.push(new cargo_lock_1.CargoLock({
                path: lockPath,
                changelogEntry,
                version: 'unused',
                versions,
                packageName: packageName.name,
            }));
        }
        return updates;
    }
    async commits(opts) {
        const sha = opts.sha;
        const perPage = opts.perPage || 100;
        const labels = opts.labels || false;
        const path = opts.path || undefined;
        if (!path) {
            return await this.gh.commitsSinceSha(sha, perPage, labels, null);
        }
        // ReleasePR.commits() does not work well with monorepos. If a release tag
        // points to a sha1 that isn't in the history for the given `path`, it wil
        // generate a changelog *from the last 100 commits*, ignoring the `sha`
        // completely.
        // To avoid that, we first fetch commits without a path:
        const relevantCommits = new Set();
        for (const commit of await this.gh.commitsSinceSha(sha, perPage, labels, null)) {
            relevantCommits.add(commit.sha);
        }
        // Then fetch commits for the path (this will include commits for
        // previous versions)
        const allPathCommits = await this.gh.commitsSinceSha(sha, perPage, labels, path);
        // Then keep only the "path commits" that are relevant for this release
        const commits = allPathCommits.filter(commit => relevantCommits.has(commit.sha));
        if (commits.length) {
            logger_1.logger.info(`found ${commits.length} commits for ${path} since ${sha ? sha : 'beginning of time'}`);
        }
        else {
            logger_1.logger.warn(`no commits found since ${sha}`);
        }
        return commits;
    }
    defaultInitialVersion() {
        return '0.1.0';
    }
    // Always prefer the Cargo.toml name
    async getPackageName() {
        var _a, _b;
        if (this._packageName === undefined) {
            const packageManifest = await this.getPackageManifest();
            this.packageName = this._packageName = (_b = (_a = packageManifest === null || packageManifest === void 0 ? void 0 : packageManifest.package) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : this.packageName;
        }
        return {
            name: this.packageName,
            getComponent: () => this.packageName,
        };
    }
    /**
     * @returns the package's manifest, ie. `crates/foobar/Cargo.toml`
     */
    async getPackageManifest() {
        if (this.packageManifest === undefined) {
            this.packageManifest = await this.getManifest(this.addPath('Cargo.toml'));
        }
        return this.packageManifest;
    }
    /**
     * @returns the workspace's manifest, ie. `Cargo.toml` (top-level)
     */
    async getWorkspaceManifest() {
        if (this.workspaceManifest === undefined) {
            this.workspaceManifest = await this.getManifest('Cargo.toml');
        }
        return this.workspaceManifest;
    }
    async getManifest(path) {
        let content;
        try {
            content = await this.gh.getFileContents(path);
        }
        catch (e) {
            return null;
        }
        return common_1.parseCargoManifest(content.parsedContent);
    }
    async exists(path) {
        try {
            await this.gh.getFileContents(path);
            return true;
        }
        catch (_e) {
            return false;
        }
    }
}
exports.Rust = Rust;
//# sourceMappingURL=rust.js.map