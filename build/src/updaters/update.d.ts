import { GitHubFileContents } from '../github';
export declare type VersionsMap = Map<string, string>;
export interface UpdateOptions {
    changelogEntry: string;
    packageName: string;
    path: string;
    version: string;
    versions?: VersionsMap;
    contents?: GitHubFileContents;
}
export interface Update {
    changelogEntry: string;
    create: boolean;
    path: string;
    packageName: string;
    version: string;
    versions?: VersionsMap;
    contents?: GitHubFileContents;
    updateContent(content: string | undefined): string;
}
