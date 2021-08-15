import { ReleaseCandidate } from '../release-pr';
import { ConventionalCommits } from '../conventional-commits';
import { GitHubTag } from '../github';
import { VersionsMap } from '../updaters/update';
import { Commit } from '../graphql-to-commits';
import { BumpType } from './java/bump_type';
import { JavaYoshi } from './java-yoshi';
export declare class JavaBom extends JavaYoshi {
    private bumpType?;
    protected coerceVersions(cc: ConventionalCommits, _candidate: ReleaseCandidate, latestTag: GitHubTag | undefined, currentVersions: VersionsMap): Promise<VersionsMap>;
    private getBumpType;
    protected coerceReleaseCandidate(cc: ConventionalCommits, latestTag: GitHubTag | undefined, _preRelease?: boolean): Promise<ReleaseCandidate>;
    static dependencyUpdates(commits: Commit[]): VersionsMap;
    static isNonPatchVersion(commit: Commit): boolean;
    static determineBumpType(commits: Commit[]): BumpType;
}
