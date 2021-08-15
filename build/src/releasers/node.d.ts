import { ReleasePR, ReleaseCandidate, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
export declare class Node extends ReleasePR {
    private pkgJsonContents?;
    private _packageName?;
    enableSimplePrereleaseParsing: boolean;
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    getPackageName(): Promise<PackageName>;
    private getPkgJsonContents;
}
