import { GitHubFileContents, GitHub } from '../../src/github';
import { SinonSandbox } from 'sinon';
export declare function buildGitHubFileContent(fixturesPath: string, fixture: string): GitHubFileContents;
export declare function buildGitHubFileRaw(content: string): GitHubFileContents;
export interface StubFiles {
    sandbox: SinonSandbox;
    github: GitHub;
    defaultBranch?: string;
    fixturePath: string;
    files: string[];
    flatten?: boolean;
    inlineFiles?: [string, string][];
}
export declare function stubFilesFromFixtures(options: StubFiles): void;
export declare function getFilesInDir(directory: string, fileList?: string[]): string[];
export declare function getFilesInDirWithPrefix(directory: string, prefix: string): string[];
