#!/usr/bin/env node
import * as yargs from 'yargs';
import { GitHubReleaseFactoryOptions } from '..';
interface ErrorObject {
    body?: object;
    status?: number;
    message: string;
    stack: string;
}
export declare const parser: yargs.Argv<yargs.Omit<yargs.Omit<GitHubReleaseFactoryOptions & {
    debug: boolean;
}, "token"> & {
    token: unknown;
} & {
    "api-url": string;
} & {
    "default-branch": string | undefined;
}, "fork"> & {
    fork: boolean;
} & {
    "repo-url": unknown;
}>;
interface HandleError {
    (err: ErrorObject): void;
    logger?: Console;
    yargsArgs?: yargs.Arguments;
}
export declare const handleError: HandleError;
export {};
