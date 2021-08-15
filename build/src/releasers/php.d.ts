import { ReleasePR, ReleaseCandidate, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
import { ReleasePRConstructorOptions } from '..';
export declare class PHP extends ReleasePR {
    constructor(options: ReleasePRConstructorOptions);
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
}
