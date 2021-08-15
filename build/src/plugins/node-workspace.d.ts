import { ManifestPlugin } from './plugin';
import { ManifestPackageWithPRData } from '..';
import { VersionsMap } from '../updaters/update';
export default class NodeWorkspaceDependencyUpdates extends ManifestPlugin {
    private filterPackages;
    private getAllWorkspacePackages;
    private runLernaVersion;
    private updatePkgsWithPRData;
    private getChangelogDepsNotes;
    private updateChangelogEntry;
    private newChangelogEntry;
    private setChangelogEntry;
    /**
     * Update node monorepo workspace package dependencies.
     * Inspired by and using a subset of the logic from `lerna version`
     */
    run(newManifestVersions: VersionsMap, pkgsWithPRData: ManifestPackageWithPRData[]): Promise<[VersionsMap, ManifestPackageWithPRData[]]>;
}
