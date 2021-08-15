import { ReleasePRConstructorOptions } from '..';
import { ReleasePR, ReleaseCandidate, GetCommitsOptions, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
import { Commit } from '../graphql-to-commits';
export declare class Ruby extends ReleasePR {
    versionFile: string;
    constructor(options: ReleasePRConstructorOptions);
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    tagSeparator(): string;
    protected commits(opts: GetCommitsOptions): Promise<Commit[]>;
}
