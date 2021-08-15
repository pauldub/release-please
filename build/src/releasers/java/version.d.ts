import { BumpType } from './bump_type';
export declare class Version {
    major: number;
    minor: number;
    patch: number;
    extra: string;
    snapshot: boolean;
    lts?: number;
    constructor(major: number, minor: number, patch: number, extra: string, snapshot: boolean, lts?: number);
    static parse(version: string): Version;
    bump(bumpType: BumpType): Version;
    toString(): string;
}
