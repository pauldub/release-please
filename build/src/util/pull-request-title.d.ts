export declare function generateMatchPattern(pullRequestTitlePattern?: string): RegExp;
export declare class PullRequestTitle {
    component?: string;
    targetBranch?: string;
    version: string;
    pullRequestTitlePattern: string;
    matchPattern: RegExp;
    private constructor();
    static parse(title: string, pullRequestTitlePattern?: string): PullRequestTitle | undefined;
    static ofComponentVersion(component: string, version: string, pullRequestTitlePattern?: string): PullRequestTitle;
    static ofVersion(version: string, pullRequestTitlePattern?: string): PullRequestTitle;
    static ofTargetBranchVersion(targetBranch: string, version: string, pullRequestTitlePattern?: string): PullRequestTitle;
    static ofComponentTargetBranchVersion(component: string, targetBranch: string, version: string, pullRequestTitlePattern?: string): PullRequestTitle;
    getTargetBranch(): string | undefined;
    getComponent(): string | undefined;
    getVersion(): string;
    toString(): string;
}
