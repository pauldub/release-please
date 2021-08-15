import { ReleasePR, ReleaseCandidate, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
import { ReleasePRConstructorOptions } from '..';
import { PyProject } from '../updaters/python/pyproject-toml';
export declare class Python extends ReleasePR {
    enableSimplePrereleaseParsing: boolean;
    constructor(options: ReleasePRConstructorOptions);
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    protected getPyProject(): Promise<PyProject | null>;
    defaultInitialVersion(): string;
}
