import { Update, UpdateOptions } from './update';
import { GitHubFileContents } from '../github';
export declare class VersionTxt implements Update {
    path: string;
    changelogEntry: string;
    version: string;
    packageName: string;
    create: boolean;
    contents?: GitHubFileContents;
    constructor(options: UpdateOptions);
    updateContent(): string;
}
