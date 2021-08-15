import { ReleasePR } from '../release-pr';
export declare class HPackYoshi extends ReleasePR {
    protected _run(): Promise<number | undefined>;
    private summarizeCommits;
}
