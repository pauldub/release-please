import { ReleasePR } from '../release-pr';
export declare class RubyYoshi extends ReleasePR {
    protected _run(): Promise<number | undefined>;
    private summarizeCommits;
}
