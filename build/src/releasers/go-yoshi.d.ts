import { ReleasePR } from '../release-pr';
export declare class GoYoshi extends ReleasePR {
    changelogPath: string;
    protected _run(): Promise<number | undefined>;
    private isGapicRepo;
    private isMultiClientRepo;
    defaultInitialVersion(): string;
    tagSeparator(): string;
    private filterSubModuleCommits;
}
