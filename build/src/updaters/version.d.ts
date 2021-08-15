import { GitHubFileContents } from '../github';
import { Update, UpdateOptions, VersionsMap } from './update';
export declare class Version implements Update {
    path: string;
    changelogEntry: string;
    version: string;
    versions?: VersionsMap;
    packageName: string;
    create: boolean;
    contents?: GitHubFileContents;
    constructor(options: UpdateOptions);
    updateContent(): string;
}
