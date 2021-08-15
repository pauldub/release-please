import { Commit } from './graphql-to-commits';
export interface CommitSplitOptions {
    includeEmpty?: boolean;
    packagePaths?: string[];
}
export declare class CommitSplit {
    includeEmpty: boolean;
    packagePaths?: string[];
    constructor(opts?: CommitSplitOptions);
    split(commits: Commit[]): {
        [key: string]: Commit[];
    };
}
