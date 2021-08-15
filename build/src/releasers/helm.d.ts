import { ReleasePR, ReleaseCandidate, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
export declare class Helm extends ReleasePR {
    private chartYmlContents?;
    private _packageName?;
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    getPackageName(): Promise<PackageName>;
    private getChartYmlContents;
}
