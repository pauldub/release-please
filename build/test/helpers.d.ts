import { Commit } from '../src/graphql-to-commits';
import * as sinon from 'sinon';
export declare function stubSuggesterWithSnapshot(sandbox: sinon.SinonSandbox, snapName: string): void;
export declare function dateSafe(content: string): string;
export declare function stringifyExpectedChanges(expected: [string, object][]): string;
export declare function readPOJO(name: string): object;
export declare function buildMockCommit(message: string, files?: string[]): Commit;
