import { ManifestPackageWithPRData } from '..';
import { VersionsMap } from '../updaters/update';
import { GitHub } from '../github';
import { Config } from '../manifest';
import { Checkpoint, CheckpointType } from '../util/checkpoint';
export declare abstract class ManifestPlugin {
    gh: GitHub;
    config: Config;
    tag: string;
    checkpoint: Checkpoint;
    constructor(github: GitHub, config: Config, tag: string, logger?: Checkpoint);
    /**
     * @param newManifestVersions - new package versions set by releasers and any
     *   previous plugins
     * @param pkgsWithPRData - PR data per package (e.g. changelog, package.json)
     * @returns - tuple of the input arguments including any changes, additions
     *   and/or subtractions.
     */
    abstract run(newManifestVersions: VersionsMap, pkgsWithPRData: ManifestPackageWithPRData[]): Promise<[VersionsMap, ManifestPackageWithPRData[]]>;
    protected log(msg: string, cpType: CheckpointType): void;
}
