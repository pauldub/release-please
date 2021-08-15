import { OctokitAPIs, GitHub } from './github';
import { ReleaseType } from './releasers';
import { ReleasePR } from './release-pr';
import { ChangelogSection } from './conventional-commits';
import { Checkpoint } from './util/checkpoint';
import { Changes } from 'code-suggester';
export { ReleaseCandidate, ReleasePR } from './release-pr';
export * as Errors from './errors';
interface GitHubOptions {
    defaultBranch?: string;
    fork?: boolean;
    token?: string;
    apiUrl?: string;
    octokitAPIs?: OctokitAPIs;
}
export interface GitHubReleaseOptions {
    releaseLabel?: string;
    draft?: boolean;
}
export interface ReleasePROptions {
    path?: string;
    packageName?: string;
    bumpMinorPreMajor?: boolean;
    bumpPatchForMinorPreMajor?: boolean;
    releaseAs?: string;
    snapshot?: boolean;
    monorepoTags?: boolean;
    changelogSections?: ChangelogSection[];
    changelogPath?: string;
    lastPackageVersion?: string;
    versionFile?: string;
    pullRequestTitlePattern?: string;
    extraFiles?: string[];
}
export interface GitHubConstructorOptions extends GitHubOptions {
    owner: string;
    repo: string;
}
interface ReleaserConstructorOptions {
    github: GitHub;
}
interface ManifestOptions {
    configFile?: string;
    manifestFile?: string;
}
export interface ManifestConstructorOptions extends ReleaserConstructorOptions, ManifestOptions {
    checkpoint?: Checkpoint;
}
export interface ManifestFactoryOptions extends GitHubFactoryOptions, ManifestOptions {
}
export declare type ManifestPackage = Pick<ReleasePROptions & GitHubReleaseOptions, 'draft' | 'packageName' | 'bumpMinorPreMajor' | 'bumpPatchForMinorPreMajor' | 'releaseAs' | 'changelogSections' | 'changelogPath'> & {
    path: string;
    releaseType: ReleaseType;
};
export interface ManifestPackageWithPRData {
    config: ManifestPackage;
    prData: {
        version: string;
        changes: Changes;
    };
}
export interface ReleasePRConstructorOptions extends ReleasePROptions, ReleaserConstructorOptions {
    labels?: string[];
    skipDependencyUpdates?: boolean;
}
export interface GitHubReleaseConstructorOptions extends GitHubReleaseOptions, ReleaserConstructorOptions {
    releasePR: ReleasePR;
}
interface FactoryOptions {
    repoUrl: string;
}
export interface GitHubFactoryOptions extends GitHubOptions, FactoryOptions {
}
interface ReleaserFactory {
    releaseType?: ReleaseType;
}
export interface ReleasePRFactoryOptions extends ReleasePROptions, GitHubFactoryOptions, ReleaserFactory {
    label?: string;
}
export interface GitHubReleaseFactoryOptions extends GitHubReleaseOptions, ReleasePROptions, ReleasePRFactoryOptions, GitHubFactoryOptions {
}
export { factory } from './factory';
export { getReleaserTypes, getReleasers } from './releasers';
export { GitHubRelease } from './github-release';
export { JavaYoshi } from './releasers/java-yoshi';
export { Ruby } from './releasers/ruby';
export { setLogger, Logger } from './util/logger';
