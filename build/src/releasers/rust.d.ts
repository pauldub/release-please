import { ReleasePR, ReleaseCandidate, PackageName } from '../release-pr';
import { Update } from '../updaters/update';
import { Commit } from '../graphql-to-commits';
import { CargoManifest } from '../updaters/rust/common';
export declare class Rust extends ReleasePR {
    private packageManifest?;
    private workspaceManifest?;
    private _packageName?;
    protected buildUpdates(changelogEntry: string, candidate: ReleaseCandidate, packageName: PackageName): Promise<Update[]>;
    protected commits(opts: GetCommitsOptions): Promise<Commit[]>;
    defaultInitialVersion(): string;
    getPackageName(): Promise<PackageName>;
    /**
     * @returns the package's manifest, ie. `crates/foobar/Cargo.toml`
     */
    protected getPackageManifest(): Promise<CargoManifest | null>;
    /**
     * @returns the workspace's manifest, ie. `Cargo.toml` (top-level)
     */
    protected getWorkspaceManifest(): Promise<CargoManifest | null>;
    protected getManifest(path: string): Promise<CargoManifest | null>;
    protected exists(path: string): Promise<boolean>;
}
interface GetCommitsOptions {
    sha?: string;
    perPage?: number;
    labels?: boolean;
    path?: string;
}
export {};
