import { BranchName } from '../util/branch-name';
import { GitHubFileContents, GitHubTag } from '../github';
import { ConventionalCommits } from '../conventional-commits';
import { ReleaseCandidate } from '..';
import { VersionsMap, Update } from '../updaters/update';
import { PackageName, ReleasePR } from '../release-pr';
export declare class JavaYoshi extends ReleasePR {
    private versionsManifestContent?;
    protected getVersionManifestContent(): Promise<GitHubFileContents>;
    protected _run(): Promise<number | undefined>;
    protected generateChangelog(cc: ConventionalCommits, candidate: ReleaseCandidate): Promise<string>;
    protected coerceReleaseCandidate(cc: ConventionalCommits, latestTag: GitHubTag | undefined, preRelease?: boolean): Promise<ReleaseCandidate>;
    protected buildJavaUpdates(changelogEntry: string, candidateVersions: VersionsMap, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    protected supportsSnapshots(): boolean;
    defaultInitialVersion(): string;
    protected coerceVersions(cc: ConventionalCommits, candidate: ReleaseCandidate, _latestTag: GitHubTag | undefined, currentVersions: VersionsMap): Promise<VersionsMap>;
    protected buildBranchName(_version: string, includePackageName: boolean): Promise<BranchName>;
    protected buildPullRequestTitle(version: string, includePackageName: boolean): Promise<string>;
    /**
     * Normalize version parsing when searching for a latest release.
     *
     * @param version The raw version string
     * @param preRelease Whether to allow pre-release versions or not
     * @returns {string|null} The normalized version string or null if
     *   we want to disallow this version.
     */
    protected normalizeVersion(version: string, preRelease?: boolean): string | null;
}
