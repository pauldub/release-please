import { ReleasePRConstructorOptions } from './';
import { ConventionalCommits, ChangelogSection } from './conventional-commits';
import { GitHub, GitHubTag, MergedGitHubPR } from './github';
import { Commit } from './graphql-to-commits';
import { Update } from './updaters/update';
import { BranchName } from './util/branch-name';
export interface ReleaseCandidate {
    version: string;
    previousTag?: string;
}
export interface CandidateRelease {
    sha: string;
    tag: string;
    notes: string;
    name: string;
    version: string;
    pullNumber: number;
}
export interface GetCommitsOptions {
    sha?: string;
    perPage?: number;
    labels?: boolean;
    path?: string;
}
export interface PackageName {
    name: string;
    getComponent: () => string;
}
export interface OpenPROptions {
    sha: string;
    changelogEntry: string;
    updates: Update[];
    version: string;
    includePackageName: boolean;
}
export declare class ReleasePR {
    labels: string[];
    gh: GitHub;
    bumpMinorPreMajor?: boolean;
    bumpPatchForMinorPreMajor?: boolean;
    path?: string;
    packageName: string;
    monorepoTags: boolean;
    releaseAs?: string;
    snapshot?: boolean;
    lastPackageVersion?: string;
    changelogSections?: ChangelogSection[];
    changelogPath: string;
    pullRequestTitlePattern?: string;
    extraFiles: string[];
    forManifestReleaser: boolean;
    enableSimplePrereleaseParsing: boolean;
    constructor(options: ReleasePRConstructorOptions);
    getPackageName(): Promise<PackageName>;
    getOpenPROptions(commits: Commit[], latestTag?: GitHubTag): Promise<OpenPROptions | undefined>;
    protected _getOpenPROptions(commits: Commit[], latestTag?: GitHubTag): Promise<OpenPROptions | undefined>;
    run(): Promise<number | undefined>;
    protected _run(): Promise<number | undefined>;
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    protected supportsSnapshots(): boolean;
    protected closeStaleReleasePRs(currentPRNumber: number, includePackageName?: boolean): Promise<void>;
    defaultInitialVersion(): string;
    tagSeparator(): string;
    protected normalizeTagName(versionOrTagName: string): Promise<string>;
    protected coerceReleaseCandidate(cc: ConventionalCommits, latestTag: GitHubTag | undefined, enableSimplePrereleaseParsing?: boolean): Promise<ReleaseCandidate>;
    protected commits(opts: GetCommitsOptions): Promise<Commit[]>;
    protected buildPullRequestTitle(version: string, includePackageName: boolean): Promise<string>;
    protected detectReleaseVersionFromTitle(title: string): string | undefined;
    protected buildBranchName(version: string, includePackageName: boolean): Promise<BranchName>;
    protected buildPullRequestBody(_version: string, changelogEntry: string): Promise<string>;
    protected openPR(options: OpenPROptions): Promise<number | undefined>;
    protected changelogEmpty(changelogEntry: string): boolean;
    addPath(file: string): string;
    protected detectReleaseVersionFromCode(): Promise<string | undefined>;
    private detectReleaseVersion;
    private formatReleaseTagName;
    private validateConfiguration;
    buildRelease(): Promise<CandidateRelease | undefined>;
    buildReleaseForVersion(version: string, mergedPR: MergedGitHubPR): Promise<CandidateRelease>;
    private findMergedRelease;
    /**
     * Normalize version parsing when searching for a latest release.
     *
     * @param version The raw version string
     * @param preRelease Whether to allow pre-release versions or not
     * @returns {string|null} The normalized version string or null if
     *   we want to disallow this version.
     */
    protected normalizeVersion(version: string, preRelease?: boolean): string | null;
    /**
     * Find the most recent matching release tag on the branch we're
     * configured for.
     *
     * @param {string} prefix - Limit the release to a specific component.
     * @param {boolean} preRelease - Whether or not to return pre-release
     *   versions. Defaults to false.
     */
    latestTag(prefix?: string, preRelease?: boolean): Promise<GitHubTag | undefined>;
}
