import { ReleaseCandidate, PackageName, ReleasePR } from '../release-pr';
import { Update } from '../updaters/update';
export declare class KRMBlueprint extends ReleasePR {
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    defaultInitialVersion(): string;
}
