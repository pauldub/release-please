import { Update, UpdateOptions, VersionsMap } from './update';
import { GitHubFileContents } from '../github';
export declare class Changelog implements Update {
    path: string;
    changelogEntry: string;
    version: string;
    versions?: VersionsMap;
    packageName: string;
    create: boolean;
    contents?: GitHubFileContents;
    constructor(options: UpdateOptions);
    updateContent(content: string | undefined): string;
    private header;
}
