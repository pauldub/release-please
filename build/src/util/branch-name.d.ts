export declare class BranchName {
    component?: string;
    targetBranch?: string;
    version?: string;
    static parse(branchName: string): BranchName | undefined;
    static ofComponentVersion(branchPrefix: string, version: string): BranchName;
    static ofVersion(version: string): BranchName;
    static ofTargetBranch(targetBranch: string): BranchName;
    static ofComponentTargetBranch(component: string, targetBranch: string): BranchName;
    constructor(_branchName: string);
    static matches(_branchName: string): boolean;
    getTargetBranch(): string | undefined;
    getComponent(): string | undefined;
    getVersion(): string | undefined;
    toString(): string;
}
