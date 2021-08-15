import { Update, UpdateOptions, VersionsMap } from '../update';
import { GitHubFileContents } from '../../github';
interface PyProjectContent {
    name: string;
    version: string;
}
/**
 * A subset of the contents of a `pyproject.toml`
 */
export interface PyProject {
    project?: PyProjectContent;
    tool?: {
        poetry?: PyProjectContent;
    };
}
export declare function parsePyProject(content: string): PyProject;
export declare class PyProjectToml implements Update {
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
export {};
