import { ReleaseCandidate } from '../release-pr';
import { ConventionalCommits } from '../conventional-commits';
import { GitHubTag } from '../github';
import { VersionsMap } from '../updaters/update';
import { JavaYoshi } from './java-yoshi';
export declare class JavaLTS extends JavaYoshi {
    protected coerceVersions(_cc: ConventionalCommits, _candidate: ReleaseCandidate, _latestTag: GitHubTag | undefined, currentVersions: VersionsMap): Promise<VersionsMap>;
    protected coerceReleaseCandidate(cc: ConventionalCommits, latestTag: GitHubTag | undefined, _preRelease?: boolean): Promise<ReleaseCandidate>;
}
