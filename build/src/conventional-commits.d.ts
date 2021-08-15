import { ReleaseType } from 'semver';
import { Commit } from './graphql-to-commits';
import { ConventionalChangelogCommit } from '@conventional-commits/parser';
interface CommitWithHash extends ConventionalChangelogCommit {
    hash: string | null;
}
interface ConventionalCommitsOptions {
    commits: Commit[];
    owner: string;
    repository: string;
    host?: string;
    bumpMinorPreMajor?: boolean;
    bumpPatchForMinorPreMajor?: boolean;
    commitPartial?: string;
    headerPartial?: string;
    mainTemplate?: string;
    changelogSections?: ChangelogSection[];
    commitFilter?: (c: ConventionalChangelogCommit) => boolean;
}
export interface ChangelogSection {
    type: string;
    section: string;
    hidden?: boolean;
}
interface ChangelogEntryOptions {
    version: string;
    previousTag?: string;
    currentTag?: string;
}
interface BumpSuggestion {
    releaseType: ReleaseType;
    reason: string;
    level: number;
}
export declare class ConventionalCommits {
    commits: Commit[];
    host: string;
    owner: string;
    repository: string;
    bumpMinorPreMajor?: boolean;
    bumpPatchForMinorPreMajor?: boolean;
    commitPartial?: string;
    headerPartial?: string;
    mainTemplate?: string;
    changelogSections?: ChangelogSection[];
    private commitFilter?;
    parsedCommits: CommitWithHash[];
    constructor(options: ConventionalCommitsOptions);
    suggestBump(version: string): Promise<BumpSuggestion>;
    generateChangelogEntry(options: ChangelogEntryOptions): Promise<string>;
    private guessReleaseType;
}
export {};
