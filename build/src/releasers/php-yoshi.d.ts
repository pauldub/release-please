import { ReleasePR } from '../release-pr';
export declare class PHPYoshi extends ReleasePR {
    protected _run(): Promise<number | undefined>;
    private releaseAllPHPLibraries;
}
