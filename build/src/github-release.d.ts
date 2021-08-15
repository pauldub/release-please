import { GitHubReleaseConstructorOptions } from './';
import { GitHub, MergedGitHubPR, ReleaseCreateResponse } from './github';
import { ReleasePR, CandidateRelease } from './release-pr';
export declare const GITHUB_RELEASE_LABEL = "autorelease: tagged";
export interface GitHubReleaseResponse {
    major: number;
    minor: number;
    patch: number;
    version: string;
    sha: string;
    html_url: string;
    name: string;
    tag_name: string;
    upload_url: string;
    pr: number;
    draft: boolean;
    body: string;
}
export declare class GitHubRelease {
    releasePR: ReleasePR;
    gh: GitHub;
    draft: boolean;
    releaseLabel: string;
    constructor(options: GitHubReleaseConstructorOptions);
    createRelease(): Promise<[CandidateRelease, ReleaseCreateResponse] | [undefined, undefined]>;
    createRelease(version: string, mergedPR: MergedGitHubPR): Promise<ReleaseCreateResponse | undefined>;
    run(): Promise<GitHubReleaseResponse | undefined>;
    releaseResponse(params: {
        release: ReleaseCreateResponse;
        version: string;
        sha: string;
        number: number;
    }): GitHubReleaseResponse | undefined;
}
