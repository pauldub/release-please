import { ManifestPackageWithPRData } from '..';
import { VersionsMap } from '../updaters/update';
import { ManifestPlugin } from './plugin';
export default class CargoWorkspaceDependencyUpdates extends ManifestPlugin {
    private getWorkspaceManifest;
    run(newManifestVersions: VersionsMap, pkgsWithPRData: ManifestPackageWithPRData[]): Promise<[VersionsMap, ManifestPackageWithPRData[]]>;
    private setChangelogEntry;
    private getChangelogDepsNotes;
    private updateChangelogEntry;
    private newChangelogEntry;
    private getAllCrateInfos;
}
export interface GraphNode {
    name: string;
    deps: string[];
}
export declare type Graph = Map<string, GraphNode>;
/**
 * Given a list of graph nodes that form a DAG, returns the node names in
 * post-order (reverse depth-first), suitable for dependency updates and bumping.
 */
export declare function postOrder(graph: Graph): string[];
