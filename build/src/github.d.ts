import { Changes } from 'code-suggester';
import { Octokit } from '@octokit/rest';
import { request } from '@octokit/request';
import { PromiseValue } from 'type-fest';
declare type OctokitType = InstanceType<typeof Octokit>;
declare type PullsListResponseItems = PromiseValue<ReturnType<InstanceType<typeof Octokit>['pulls']['list']>>['data'];
export declare type ReleaseCreateResponse = {
    name: string;
    tag_name: string;
    draft: boolean;
    html_url: string;
    upload_url: string;
    body: string;
};
declare type RequestBuilderType = typeof request;
declare type DefaultFunctionType = RequestBuilderType['defaults'];
declare type RequestFunctionType = ReturnType<DefaultFunctionType>;
declare type MergedPullRequestFilter = (filter: MergedGitHubPR) => boolean;
declare type CommitFilter = (commit: Commit, pullRequest: MergedGitHubPR | undefined) => boolean;
import { Commit, PREdge } from './graphql-to-commits';
import { Update } from './updaters/update';
import { GitHubConstructorOptions } from '.';
export interface OctokitAPIs {
    graphql: Function;
    request: RequestFunctionType;
    octokit: OctokitType;
}
export interface GitHubTag {
    name: string;
    sha: string;
    version: string;
}
export interface GitHubFileContents {
    sha: string;
    content: string;
    parsedContent: string;
}
export interface GitHubPR {
    branch: string;
    title: string;
    body: string;
    updates: Update[];
    labels: string[];
    changes?: Changes;
}
export interface MergedGitHubPR {
    sha: string;
    number: number;
    baseRefName: string;
    headRefName: string;
    labels: string[];
    title: string;
    body: string;
}
interface CommitWithPullRequest {
    commit: Commit;
    pullRequest?: MergedGitHubPR;
}
export interface MergedGitHubPRWithFiles extends MergedGitHubPR {
    files: string[];
}
export interface Repository<T> {
    repository: T;
}
interface Nodes<T> {
    nodes: T[];
}
export interface PageInfo {
    endCursor: string;
    hasNextPage: boolean;
}
interface PullRequestNode {
    title: string;
    body: string;
    number: number;
    mergeCommit: {
        oid: string;
    };
    files: {
        pageInfo: PageInfo;
    } & Nodes<{
        path: string;
    }>;
    labels: Nodes<{
        name: string;
    }>;
}
export interface PullRequests {
    pullRequests: Nodes<PullRequestNode>;
}
export declare class GitHub {
    defaultBranch?: string;
    octokit: OctokitType;
    request: RequestFunctionType;
    graphql: Function;
    token: string | undefined;
    owner: string;
    repo: string;
    apiUrl: string;
    fork: boolean;
    repositoryDefaultBranch?: string;
    constructor(options: GitHubConstructorOptions);
    private makeGraphqlRequest;
    private graphqlRequest;
    private decoratePaginateOpts;
    /**
     * Returns the list of commits since a given SHA on the target branch
     *
     * @param {string} sha SHA of the base commit or undefined for all commits
     * @param {string} path If provided, limit to commits that affect the provided path
     * @param {number} per_page Pagination option. Defaults to 100
     * @returns {Commit[]} List of commits
     * @throws {GitHubAPIError} on an API error
     */
    commitsSinceShaRest: (sha?: string | undefined, path?: string | undefined, per_page?: any) => Promise<Commit[]>;
    /**
     * Returns the list of commits since a given SHA on the target branch
     *
     * Note: Commit.files only for commits from PRs.
     *
     * @param {string|undefined} sha SHA of the base commit or undefined for all commits
     * @param {number} perPage Pagination option. Defaults to 100
     * @param {boolean} labels Whether or not to return labels. Defaults to false
     * @param {string|null} path If provided, limit to commits that affect the provided path
     * @returns {Commit[]} List of commits
     * @throws {GitHubAPIError} on an API error
     */
    commitsSinceSha(sha: string | undefined, perPage?: number, labels?: boolean, path?: string | null): Promise<Commit[]>;
    private commitsWithFiles;
    private commitsWithLabels;
    /**
     * Return the pull request files
     *
     * @param {number} num Pull request number
     * @param {string} cursor Pagination cursor
     * @param {number} maxFilesChanged Number of files to return per page
     * @return {PREdge}
     * @throws {GitHubAPIError} on an API error
     */
    pullRequestFiles(num: number, cursor: string, maxFilesChanged?: number): Promise<PREdge>;
    /**
     * Find the SHA of the commit at the provided tag.
     *
     * @param {string} name Tag name
     * @returns {string} The SHA of the commit
     * @throws {GitHubAPIError} on an API error
     */
    getTagSha: (name: string) => Promise<string>;
    /**
     * Find the "last" merged PR given a headBranch. "last" here means
     * the most recently created. Includes all associated files.
     *
     * @param {string} headBranch - e.g. "release-please/branches/main"
     * @returns {MergedGitHubPRWithFiles} - if found, otherwise undefined.
     * @throws {GitHubAPIError} on an API error
     */
    lastMergedPRByHeadBranch(headBranch: string): Promise<MergedGitHubPRWithFiles | undefined>;
    /**
     * If we can't find a release branch (a common cause of this, as an example
     * is that we might be dealing with the first relese), use the last semver
     * tag that's available on the repository:
     *
     * TODO: it would be good to not need to maintain this logic, and the
     * logic that introspects version based on the prior release PR.
     *
     * @param {string} prefix If provided, filter the tags with this prefix
     * @param {boolean} preRelease Whether or not to include pre-releases
     * @return {GitHubTag|undefined}
     * @throws {GitHubAPIError} on an API error   *
     */
    latestTagFallback(prefix?: string, preRelease?: boolean): Promise<GitHubTag | undefined>;
    private allTags;
    private mergeCommitsGraphQL;
    /**
     * Search through commit history to find the latest commit that matches to
     * provided filter.
     *
     * @param {CommitFilter} filter - Callback function that returns whether a
     *   commit/pull request matches certain criteria
     * @param {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @returns {CommitWithPullRequest}
     * @throws {GitHubAPIError} on an API error
     */
    findMergeCommit(filter: CommitFilter, maxResults?: number): Promise<CommitWithPullRequest | undefined>;
    /**
     * Iterate through commit history with a max number of results scanned.
     *
     * @param maxResults {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @yields {CommitWithPullRequest}
     * @throws {GitHubAPIError} on an API error
     */
    mergeCommitIterator(maxResults?: number): AsyncGenerator<CommitWithPullRequest, void, unknown>;
    /**
     * Iterate through merged pull requests with a max number of results scanned.
     *
     * @param maxResults {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @yields {MergedGitHubPR}
     * @throws {GitHubAPIError} on an API error
     */
    mergedPullRequestIterator(branch: string, maxResults?: number): AsyncGenerator<MergedGitHubPR, void, unknown>;
    /**
     * Returns the list of commits to the default branch after the provided filter
     * query has been satified.
     *
     * @param {CommitFilter} filter - Callback function that returns whether a
     *   commit/pull request matches certain criteria
     * @param {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @returns {Commit[]} - List of commits to current branch
     * @throws {GitHubAPIError} on an API error
     */
    commitsSince(filter: CommitFilter, maxResults?: number): Promise<Commit[]>;
    /**
     * Return a list of merged pull requests. The list is not guaranteed to be sorted
     * by merged_at, but is generally most recent first.
     *
     * @param {string} targetBranch - Base branch of the pull request. Defaults to
     *   the configured default branch.
     * @param {number} page - Page of results. Defaults to 1.
     * @param {number} perPage - Number of results per page. Defaults to 100.
     * @returns {MergedGitHubPR[]} - List of merged pull requests
     * @throws {GitHubAPIError} on an API error
     */
    findMergedPullRequests: (targetBranch?: string | undefined, page?: any, perPage?: any) => Promise<MergedGitHubPR[]>;
    /**
     * Helper to find the first merged pull request that matches the
     * given criteria. The helper will paginate over all pull requests
     * merged into the specified target branch.
     *
     * @param {string} targetBranch - Base branch of the pull request
     * @param {MergedPullRequestFilter} filter - Callback function that
     *   returns whether a pull request matches certain criteria
     * @param {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @returns {MergedGitHubPR | undefined} - Returns the first matching
     *   pull request, or `undefined` if no matching pull request found.
     * @throws {GitHubAPIError} on an API error
     */
    findMergedPullRequest(targetBranch: string, filter: MergedPullRequestFilter, maxResults?: number): Promise<MergedGitHubPR | undefined>;
    /**
     * Find the last merged pull request that targeted the default
     * branch and looks like a release PR.
     *
     * Note: The default matcher will rule out pre-releases.
     *
     * @param {string[]} labels - If provided, ensure that the pull
     *   request has all of the specified labels
     * @param {string|undefined} branchPrefix - If provided, limit
     *   release pull requests that contain the specified component
     * @param {boolean} preRelease - Whether to include pre-release
     *   versions in the response. Defaults to true.
     * @param {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @returns {MergedGitHubPR|undefined}
     * @throws {GitHubAPIError} on an API error
     */
    findMergedReleasePR(labels: string[], branchPrefix?: string | undefined, preRelease?: boolean, maxResults?: number): Promise<MergedGitHubPR | undefined>;
    private hasAllLabels;
    /**
     * Find open pull requests with matching labels.
     *
     * @param {string[]} labels List of labels to match
     * @param {number} perPage Optional. Defaults to 100
     * @return {PullsListResponseItems} Pull requests
     * @throws {GitHubAPIError} on an API error
     */
    findOpenReleasePRs(labels: string[], perPage?: number): Promise<PullsListResponseItems>;
    /**
     * Add labels to an issue or pull request
     *
     * @param {string[]} labels List of labels to add
     * @param {number} pr Issue or pull request number
     * @return {boolean} Whether or not the labels were added
     * @throws {GitHubAPIError} on an API error
     */
    addLabels(labels: string[], pr: number): Promise<boolean>;
    /**
     * Find an existing release pull request with a matching title and labels
     *
     * @param {string} title Substring to match against the issue title
     * @param {string[]} labels List of labels to match the issues
     * @return {IssuesListResponseItem|undefined}
     * @throws {AuthError} if the user is not authenticated to make this request
     * @throws {GitHubAPIError} on other API errors
     */
    findExistingReleaseIssue: (title: string, labels: string[]) => Promise<{
        id: number;
        node_id: string;
        url: string;
        repository_url: string;
        labels_url: string;
        comments_url: string;
        events_url: string;
        html_url: string;
        number: number;
        state: string;
        title: string;
        body?: string | null | undefined;
        user: {
            name?: string | null | undefined;
            email?: string | null | undefined;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string | undefined;
        } | null;
        labels: (string | {
            id?: number | undefined;
            node_id?: string | undefined;
            url?: string | undefined;
            name?: string | undefined;
            description?: string | null | undefined;
            color?: string | null | undefined;
            default?: boolean | undefined;
        })[];
        assignee: {
            name?: string | null | undefined;
            email?: string | null | undefined;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string | undefined;
        } | null;
        assignees?: ({
            name?: string | null | undefined;
            email?: string | null | undefined;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string | undefined;
        } | null)[] | null | undefined;
        milestone: {
            url: string;
            html_url: string;
            labels_url: string;
            id: number;
            node_id: string;
            number: number;
            state: ShadowRootMode;
            title: string;
            description: string | null;
            creator: {
                name?: string | null | undefined;
                email?: string | null | undefined;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string | undefined;
            } | null;
            open_issues: number;
            closed_issues: number;
            created_at: string;
            updated_at: string;
            closed_at: string | null;
            due_on: string | null;
        } | null;
        locked: boolean;
        active_lock_reason?: string | null | undefined;
        comments: number;
        pull_request?: {
            merged_at?: string | null | undefined;
            diff_url: string | null;
            html_url: string | null;
            patch_url: string | null;
            url: string | null;
        } | undefined;
        closed_at: string | null;
        created_at: string;
        updated_at: string;
        closed_by?: {
            name?: string | null | undefined;
            email?: string | null | undefined;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string | undefined;
        } | null | undefined;
        body_html?: string | undefined;
        body_text?: string | undefined;
        timeline_url?: string | undefined;
        repository?: {
            id: number;
            node_id: string;
            name: string;
            full_name: string;
            license: {
                key: string;
                name: string;
                url: string | null;
                spdx_id: string | null;
                node_id: string;
                html_url?: string | undefined;
            } | null;
            organization?: {
                name?: string | null | undefined;
                email?: string | null | undefined;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string | undefined;
            } | null | undefined;
            forks: number;
            permissions?: {
                admin: boolean;
                pull: boolean;
                triage?: boolean | undefined;
                push: boolean;
                maintain?: boolean | undefined;
            } | undefined;
            owner: {
                name?: string | null | undefined;
                email?: string | null | undefined;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string | undefined;
            } | null;
            private: boolean;
            html_url: string;
            description: string | null;
            fork: boolean;
            url: string;
            archive_url: string;
            assignees_url: string;
            blobs_url: string;
            branches_url: string;
            collaborators_url: string;
            comments_url: string;
            commits_url: string;
            compare_url: string;
            contents_url: string;
            contributors_url: string;
            deployments_url: string;
            downloads_url: string;
            events_url: string;
            forks_url: string;
            git_commits_url: string;
            git_refs_url: string;
            git_tags_url: string;
            git_url: string;
            issue_comment_url: string;
            issue_events_url: string;
            issues_url: string;
            keys_url: string;
            labels_url: string;
            languages_url: string;
            merges_url: string;
            milestones_url: string;
            notifications_url: string;
            pulls_url: string;
            releases_url: string;
            ssh_url: string;
            stargazers_url: string;
            statuses_url: string;
            subscribers_url: string;
            subscription_url: string;
            tags_url: string;
            teams_url: string;
            trees_url: string;
            clone_url: string;
            mirror_url: string | null;
            hooks_url: string;
            svn_url: string;
            homepage: string | null;
            language: string | null;
            forks_count: number;
            stargazers_count: number;
            watchers_count: number;
            size: number;
            default_branch: string;
            open_issues_count: number;
            is_template?: boolean | undefined;
            topics?: string[] | undefined;
            has_issues: boolean;
            has_projects: boolean;
            has_wiki: boolean;
            has_pages: boolean;
            has_downloads: boolean;
            archived: boolean;
            disabled: boolean;
            visibility?: string | undefined;
            pushed_at: string | null;
            created_at: string | null;
            updated_at: string | null;
            allow_rebase_merge?: boolean | undefined;
            template_repository?: {
                id?: number | undefined;
                node_id?: string | undefined;
                name?: string | undefined;
                full_name?: string | undefined;
                owner?: {
                    login?: string | undefined;
                    id?: number | undefined;
                    node_id?: string | undefined;
                    avatar_url?: string | undefined;
                    gravatar_id?: string | undefined;
                    url?: string | undefined;
                    html_url?: string | undefined;
                    followers_url?: string | undefined;
                    following_url?: string | undefined;
                    gists_url?: string | undefined;
                    starred_url?: string | undefined;
                    subscriptions_url?: string | undefined;
                    organizations_url?: string | undefined;
                    repos_url?: string | undefined;
                    events_url?: string | undefined;
                    received_events_url?: string | undefined;
                    type?: string | undefined;
                    site_admin?: boolean | undefined;
                } | undefined;
                private?: boolean | undefined;
                html_url?: string | undefined;
                description?: string | undefined;
                fork?: boolean | undefined;
                url?: string | undefined;
                archive_url?: string | undefined;
                assignees_url?: string | undefined;
                blobs_url?: string | undefined;
                branches_url?: string | undefined;
                collaborators_url?: string | undefined;
                comments_url?: string | undefined;
                commits_url?: string | undefined;
                compare_url?: string | undefined;
                contents_url?: string | undefined;
                contributors_url?: string | undefined;
                deployments_url?: string | undefined;
                downloads_url?: string | undefined;
                events_url?: string | undefined;
                forks_url?: string | undefined;
                git_commits_url?: string | undefined;
                git_refs_url?: string | undefined;
                git_tags_url?: string | undefined;
                git_url?: string | undefined;
                issue_comment_url?: string | undefined;
                issue_events_url?: string | undefined;
                issues_url?: string | undefined;
                keys_url?: string | undefined;
                labels_url?: string | undefined;
                languages_url?: string | undefined;
                merges_url?: string | undefined;
                milestones_url?: string | undefined;
                notifications_url?: string | undefined;
                pulls_url?: string | undefined;
                releases_url?: string | undefined;
                ssh_url?: string | undefined;
                stargazers_url?: string | undefined;
                statuses_url?: string | undefined;
                subscribers_url?: string | undefined;
                subscription_url?: string | undefined;
                tags_url?: string | undefined;
                teams_url?: string | undefined;
                trees_url?: string | undefined;
                clone_url?: string | undefined;
                mirror_url?: string | undefined;
                hooks_url?: string | undefined;
                svn_url?: string | undefined;
                homepage?: string | undefined;
                language?: string | undefined;
                forks_count?: number | undefined;
                stargazers_count?: number | undefined;
                watchers_count?: number | undefined;
                size?: number | undefined;
                default_branch?: string | undefined;
                open_issues_count?: number | undefined;
                is_template?: boolean | undefined;
                topics?: string[] | undefined;
                has_issues?: boolean | undefined;
                has_projects?: boolean | undefined;
                has_wiki?: boolean | undefined;
                has_pages?: boolean | undefined;
                has_downloads?: boolean | undefined;
                archived?: boolean | undefined;
                disabled?: boolean | undefined;
                visibility?: string | undefined;
                pushed_at?: string | undefined;
                created_at?: string | undefined;
                updated_at?: string | undefined;
                permissions?: {
                    admin?: boolean | undefined;
                    maintain?: boolean | undefined;
                    push?: boolean | undefined;
                    triage?: boolean | undefined;
                    pull?: boolean | undefined;
                } | undefined;
                allow_rebase_merge?: boolean | undefined;
                temp_clone_token?: string | undefined;
                allow_squash_merge?: boolean | undefined;
                allow_auto_merge?: boolean | undefined;
                delete_branch_on_merge?: boolean | undefined;
                allow_merge_commit?: boolean | undefined;
                subscribers_count?: number | undefined;
                network_count?: number | undefined;
            } | null | undefined;
            temp_clone_token?: string | undefined;
            allow_squash_merge?: boolean | undefined;
            allow_auto_merge?: boolean | undefined;
            delete_branch_on_merge?: boolean | undefined;
            allow_merge_commit?: boolean | undefined;
            subscribers_count?: number | undefined;
            network_count?: number | undefined;
            open_issues: number;
            watchers: number;
            master_branch?: string | undefined;
            starred_at?: string | undefined;
        } | undefined;
        performed_via_github_app?: {
            id: number;
            slug?: string | undefined;
            node_id: string;
            owner: {
                name?: string | null | undefined;
                email?: string | null | undefined;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string | undefined;
            } | null;
            name: string;
            description: string | null;
            external_url: string;
            html_url: string;
            created_at: string;
            updated_at: string;
            permissions: {
                issues?: string | undefined;
                checks?: string | undefined;
                metadata?: string | undefined;
                contents?: string | undefined;
                deployments?: string | undefined;
            } & {
                [key: string]: string;
            };
            events: string[];
            installations_count?: number | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            webhook_secret?: string | null | undefined;
            pem?: string | undefined;
        } | null | undefined;
        author_association: "COLLABORATOR" | "CONTRIBUTOR" | "FIRST_TIMER" | "FIRST_TIME_CONTRIBUTOR" | "MANNEQUIN" | "MEMBER" | "NONE" | "OWNER";
        reactions?: {
            url: string;
            total_count: number;
            "+1": number;
            "-1": number;
            laugh: number;
            confused: number;
            heart: number;
            hooray: number;
            eyes: number;
            rocket: number;
        } | undefined;
    } | undefined>;
    /**
     * Open a pull request
     *
     * @param {GitHubPR} options The pull request options
     * @throws {GitHubAPIError} on an API error
     */
    openPR: (options: GitHubPR) => Promise<number | undefined>;
    /**
     * Given a set of proposed updates, build a changeset to suggest.
     *
     * @param {Update[]} updates The proposed updates
     * @param {string} defaultBranch The target branch
     * @return {Changes} The changeset to suggest.
     * @throws {GitHubAPIError} on an API error
     */
    getChangeSet(updates: Update[], defaultBranch: string): Promise<Changes>;
    private getBaseLabel;
    /**
     * Returns the branch we are targetting for releases. Defaults
     * to the repository's default/primary branch.
     *
     * @returns {string}
     * @throws {GitHubAPIError} on an API error
     */
    getDefaultBranch(): Promise<string>;
    /**
     * Returns the repository's default/primary branch.
     *
     * @returns {string}
     * @throws {GitHubAPIError} on an API error
     */
    getRepositoryDefaultBranch: () => Promise<string>;
    /**
     * Close a pull request
     *
     * @param {number} prNumber The pull request number
     * @returns {boolean} Whether the request was attempts
     * @throws {GitHubAPIError} on an API error
     */
    closePR: (prNumber: number) => Promise<boolean>;
    static fullyQualifyBranchRef(refName: string): string;
    /**
     * Fetch the contents of a file with the Contents API
     *
     * @param {string} path The path to the file in the repository
     * @param {string} branch The branch to fetch from
     * @returns {GitHubFileContents}
     * @throws {GitHubAPIError} on other API errors
     */
    getFileContentsWithSimpleAPI: (path: string, ref: string, isBranch?: any) => Promise<GitHubFileContents>;
    /**
     * Fetch the contents of a file using the Git data API
     *
     * @param {string} path The path to the file in the repository
     * @param {string} branch The branch to fetch from
     * @returns {GitHubFileContents}
     * @throws {GitHubAPIError} on other API errors
     */
    getFileContentsWithDataAPI(path: string, branch: string): Promise<GitHubFileContents>;
    /**
     * Fetch the contents of a file from the configured branch
     *
     * @param {string} path The path to the file in the repository
     * @returns {GitHubFileContents}
     * @throws {GitHubAPIError} on other API errors
     */
    getFileContents(path: string): Promise<GitHubFileContents>;
    /**
     * Fetch the contents of a file
     *
     * @param {string} path The path to the file in the repository
     * @param {string} branch The branch to fetch from
     * @returns {GitHubFileContents}
     * @throws {GitHubAPIError} on other API errors
     */
    getFileContentsOnBranch: (path: string, branch: string) => Promise<GitHubFileContents>;
    /**
     * Create a GitHub release
     *
     * @param {string} packageName name of the package
     * @param {string} tagName tag to create
     * @param {string} sha SHA of commit to tag at
     * @param {string} releaseNotes Notes to add to release
     * @param {boolean} draft Whether or not to create the release as a draft
     * @throws {DuplicateReleaseError} if the release tag already exists
     * @throws {GitHubAPIError} on other API errors
     */
    createRelease: (packageName: string, tagName: string, sha: string, releaseNotes: string, draft: boolean) => Promise<ReleaseCreateResponse>;
    /**
     * Remove labels from an issue or pull request
     *
     * @param {string[]} labels The names of the labels to remove
     * @param {number} prNumber The issue or pull request number
     * @return {boolean} Whether or not the request was attempted
     * @throws {GitHubAPIError} on an API error
     */
    removeLabels: (labels: string[], prNumber: number) => Promise<boolean>;
    normalizePrefix(prefix: string): string;
    /**
     * Returns a list of paths to all files with a given name.
     *
     * If a prefix is specified, only return paths that match
     * the provided prefix.
     *
     * @param filename The name of the file to find
     * @param ref Git reference to search files in
     * @param prefix Optional path prefix used to filter results
     * @throws {GitHubAPIError} on an API error
     */
    findFilesByFilenameAndRef: (filename: string, ref: string, prefix?: string | undefined) => Promise<string[]>;
    /**
     * Returns a list of paths to all files with a given name.
     *
     * If a prefix is specified, only return paths that match
     * the provided prefix.
     *
     * @param filename The name of the file to find
     * @param prefix Optional path prefix used to filter results
     * @returns {string[]} List of file paths
     * @throws {GitHubAPIError} on an API error
     */
    findFilesByFilename(filename: string, prefix?: string): Promise<string[]>;
    /**
     * Returns a list of paths to all files with a given file
     * extension.
     *
     * If a prefix is specified, only return paths that match
     * the provided prefix.
     *
     * @param extension The file extension used to filter results.
     *   Example: `js`, `java`
     * @param ref Git reference to search files in
     * @param prefix Optional path prefix used to filter results
     * @returns {string[]} List of file paths
     * @throws {GitHubAPIError} on an API error
     */
    findFilesByExtensionAndRef: (extension: string, ref: string, prefix?: string | undefined) => Promise<string[]>;
    /**
     * Returns a list of paths to all files with a given file
     * extension.
     *
     * If a prefix is specified, only return paths that match
     * the provided prefix.
     *
     * @param extension The file extension used to filter results.
     *   Example: `js`, `java`
     * @param prefix Optional path prefix used to filter results
     * @returns {string[]} List of file paths
     * @throws {GitHubAPIError} on an API error
     */
    findFilesByExtension(extension: string, prefix?: string): Promise<string[]>;
    /**
     * Makes a comment on a issue/pull request.
     *
     * @param {string} comment - The body of the comment to post.
     * @param {number} number - The issue or pull request number.
     * @throws {GitHubAPIError} on an API error
     */
    commentOnIssue: (comment: string, number: number) => Promise<{
        id: number;
        node_id: string;
        url: string;
        body?: string | undefined;
        body_text?: string | undefined;
        body_html?: string | undefined;
        html_url: string;
        user: {
            name?: string | null | undefined;
            email?: string | null | undefined;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string | undefined;
        } | null;
        created_at: string;
        updated_at: string;
        issue_url: string;
        author_association: "COLLABORATOR" | "CONTRIBUTOR" | "FIRST_TIMER" | "FIRST_TIME_CONTRIBUTOR" | "MANNEQUIN" | "MEMBER" | "NONE" | "OWNER";
        performed_via_github_app?: {
            id: number;
            slug?: string | undefined;
            node_id: string;
            owner: {
                name?: string | null | undefined;
                email?: string | null | undefined;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string | undefined;
            } | null;
            name: string;
            description: string | null;
            external_url: string;
            html_url: string;
            created_at: string;
            updated_at: string;
            permissions: {
                issues?: string | undefined;
                checks?: string | undefined;
                metadata?: string | undefined;
                contents?: string | undefined;
                deployments?: string | undefined;
            } & {
                [key: string]: string;
            };
            events: string[];
            installations_count?: number | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            webhook_secret?: string | null | undefined;
            pem?: string | undefined;
        } | null | undefined;
        reactions?: {
            url: string;
            total_count: number;
            "+1": number;
            "-1": number;
            laugh: number;
            confused: number;
            heart: number;
            hooray: number;
            eyes: number;
            rocket: number;
        } | undefined;
    }>;
}
export {};
