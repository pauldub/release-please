import { PageInfo, GitHub } from './github';
export interface CommitsResponse {
    endCursor?: string;
    hasNextPage: boolean;
    commits: Commit[];
}
export interface Commit {
    sha: string | null;
    message: string;
    files: string[];
}
interface CommitHistoryGraphQLResponse {
    repository: {
        ref: {
            target: {
                history: CommitHistory;
            };
        };
    };
}
interface CommitHistory {
    edges: CommitEdge[];
    pageInfo: PageInfo;
}
interface CommitEdge {
    node: {
        message: string;
        oid: string;
        associatedPullRequests: {
            edges: PREdge[];
        };
    };
}
export interface PREdge {
    node: {
        number: number;
        mergeCommit: {
            oid: string;
        };
        files: {
            edges: FileEdge[];
            pageInfo: PageInfo;
        };
        labels: {
            edges: LabelEdge[];
        };
    };
}
interface FileEdge {
    node: {
        path: string;
    };
}
interface LabelEdge {
    node: {
        name: string;
    };
}
export declare function graphqlToCommits(github: GitHub, response: CommitHistoryGraphQLResponse): Promise<CommitsResponse>;
export {};
