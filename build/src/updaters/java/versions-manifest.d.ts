import { VersionsMap } from '../update';
import { JavaUpdate } from './java_update';
export declare class VersionsManifest extends JavaUpdate {
    updateContent(content: string): string;
    protected updateSingleVersion(content: string, packageName: string, version: string): string;
    static parseVersions(content: string): VersionsMap;
    static needsSnapshot(content: string): boolean;
}
