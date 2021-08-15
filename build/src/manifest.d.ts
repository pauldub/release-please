import { GitHub } from './github';
import { VersionsMap } from './updaters/update';
import { ReleaseType } from './releasers';
import { Commit } from './graphql-to-commits';
import { BranchName } from './util/branch-name';
import { ManifestConstructorOptions, ManifestPackage } from '.';
import { ChangelogSection } from './conventional-commits';
import { Checkpoint } from './util/checkpoint';
import { GitHubReleaseResponse } from './github-release';
import { PluginType } from './plugins';
interface ReleaserConfigJson {
    'release-type'?: ReleaseType;
    'bump-minor-pre-major'?: boolean;
    'bump-patch-for-minor-pre-major'?: boolean;
    'changelog-sections'?: ChangelogSection[];
    'release-as'?: string;
    draft?: boolean;
}
interface ReleaserPackageConfig extends ReleaserConfigJson {
    'package-name'?: string;
    'changelog-path'?: string;
}
export interface Config extends ReleaserConfigJson {
    packages: Record<string, ReleaserPackageConfig>;
    parsedPackages: ManifestPackage[];
    'bootstrap-sha'?: string;
    'last-release-sha'?: string;
    plugins?: PluginType[];
}
interface PackageForReleaser {
    config: ManifestPackage;
    commits: Commit[];
    lastVersion?: string;
}
declare type ManifestJson = Record<string, string>;
export declare type ManifestGitHubReleaseResult = Record<string, GitHubReleaseResponse | undefined> | undefined;
export declare class Manifest {
    gh: GitHub;
    configFileName: string;
    manifestFileName: string;
    checkpoint: Checkpoint;
    configFile?: Config;
    headManifest?: ManifestJson;
    constructor(options: ManifestConstructorOptions);
    protected getBranchName(): Promise<BranchName>;
    protected getFileJson<T>(fileName: string): Promise<T>;
    protected getFileJson<T>(fileName: string, sha: string): Promise<T | undefined>;
    protected getManifestJson(): Promise<ManifestJson>;
    protected getManifestJson(sha: string): Promise<ManifestJson | undefined>;
    protected getManifestVersions(sha?: string): Promise<[VersionsMap, string]>;
    protected getManifestVersions(sha: false, newPaths: string[]): Promise<VersionsMap>;
    protected getConfigJson(): Promise<Config>;
    private resolveReleaseAs;
    protected getPackagesToRelease(allCommits: Commit[], sha?: string): Promise<PackageForReleaser[]>;
    private validateJsonFile;
    protected validate(): Promise<boolean>;
    private getReleasePR;
    private runReleasers;
    private getManifestChanges;
    private buildPRBody;
    private buildManifestPR;
    private getPlugins;
    private resolveLastReleaseSha;
    pullRequest(): Promise<number | undefined>;
    githubRelease(): Promise<ManifestGitHubReleaseResult>;
}
export {};
