import { PackageJson } from './package-json';
export declare class PackageLockJson extends PackageJson {
    updateVersion(parsed: {
        version: string;
        lockfileVersion: number;
    }): void;
}
