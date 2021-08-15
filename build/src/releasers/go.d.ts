import { ReleasePR, ReleaseCandidate, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
export declare class Go extends ReleasePR {
    enableSimplePrereleaseParsing: boolean;
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
}
