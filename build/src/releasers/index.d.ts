import { ReleasePR } from '../release-pr';
export declare type ReleaseType = 'go' | 'go-yoshi' | 'java-bom' | 'java-lts' | 'java-yoshi' | 'krm-blueprint' | 'node' | 'ocaml' | 'php' | 'php-yoshi' | 'python' | 'ruby' | 'ruby-yoshi' | 'rust' | 'simple' | 'terraform-module' | 'helm' | 'hpack-yoshi';
declare type Releasers = Record<ReleaseType, typeof ReleasePR>;
export declare function getReleasers(): Releasers;
export declare function getReleaserNames(): string[];
export declare function getReleaserTypes(): readonly ReleaseType[];
export {};
