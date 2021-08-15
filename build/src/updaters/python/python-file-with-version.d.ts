import { Update, UpdateOptions, VersionsMap } from '../update';
import { GitHubFileContents } from '../../github';
/**
 * Python file with a __version__ property (or attribute, or whatever).
 */
export declare class PythonFileWithVersion implements Update {
    path: string;
    changelogEntry: string;
    version: string;
    versions?: VersionsMap;
    packageName: string;
    create: boolean;
    contents?: GitHubFileContents;
    constructor(options: UpdateOptions);
    updateContent(content: string): string;
}
