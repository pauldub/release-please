import * as semver from 'semver';
export declare type BumpType = 'major' | 'minor' | 'patch' | 'snapshot' | 'lts' | 'lts-snapshot';
export declare function maxBumpType(bumpTypes: BumpType[]): BumpType;
export declare function fromSemverReleaseType(releaseType: semver.ReleaseType): "patch" | "major" | "minor";
