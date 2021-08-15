"use strict";
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHub = void 0;
const code_suggester_1 = require("code-suggester");
const logger_1 = require("./util/logger");
const rest_1 = require("@octokit/rest");
const request_1 = require("@octokit/request");
const graphql_1 = require("@octokit/graphql");
const request_error_1 = require("@octokit/request-error");
function isReposListResponse(arg) {
    return typeof arg === 'object' && Object.hasOwnProperty.call(arg, 'name');
}
const chalk = require("chalk");
const semver = require("semver");
const graphql_to_commits_1 = require("./graphql-to-commits");
const branch_name_1 = require("./util/branch-name");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
let probotMode = false;
class GitHub {
    constructor(options) {
        this.graphqlRequest = wrapAsync(async (opts, maxRetries = 1) => {
            while (maxRetries >= 0) {
                try {
                    return await this.makeGraphqlRequest(opts);
                }
                catch (err) {
                    if (err.status !== 502) {
                        throw err;
                    }
                }
                maxRetries -= 1;
            }
        });
        /**
         * Returns the list of commits since a given SHA on the target branch
         *
         * @param {string} sha SHA of the base commit or undefined for all commits
         * @param {string} path If provided, limit to commits that affect the provided path
         * @param {number} per_page Pagination option. Defaults to 100
         * @returns {Commit[]} List of commits
         * @throws {GitHubAPIError} on an API error
         */
        this.commitsSinceShaRest = wrapAsync(async (sha, path, per_page = 100) => {
            let page = 1;
            let found = false;
            const baseBranch = await this.getDefaultBranch();
            const commits = [];
            while (!found) {
                const response = await this.request('GET /repos/{owner}/{repo}/commits{?sha,page,per_page,path}', {
                    owner: this.owner,
                    repo: this.repo,
                    sha: baseBranch,
                    page,
                    per_page,
                    path,
                });
                for (const commit of response.data) {
                    if (commit.sha === sha) {
                        found = true;
                        break;
                    }
                    // skip merge commits
                    if (commit.parents.length === 2) {
                        continue;
                    }
                    commits.push([commit.sha, commit.commit.message]);
                }
                page++;
            }
            const ret = [];
            for (const [ref, message] of commits) {
                const files = [];
                let page = 1;
                let moreFiles = true;
                while (moreFiles) {
                    // the "Get Commit" resource is a bit of an outlier in terms of GitHub's
                    // normal pagination: https://git.io/JmVZq
                    // The behavior is to return an object representing the commit, a
                    // property of which is an array of files. GitHub will return as many
                    // associated files as there are, up to a limit of 300, on the initial
                    // request. If there are more associated files, it will send "Links"
                    // headers to get the next set. There is a total limit of 3000
                    // files returned per commit.
                    // In practice, the links headers are just the same resourceID plus a
                    // "page=N" query parameter with "page=1" being the initial set.
                    //
                    // TODO: it is more robust to follow the link.next headers (in case
                    // GitHub ever changes the pattern) OR use ocktokit pagination for this
                    // endpoint when https://git.io/JmVll is addressed.
                    const response = (await this.request('GET /repos/{owner}/{repo}/commits/{ref}{?page}', { owner: this.owner, repo: this.repo, ref, page }));
                    const commitFiles = response.data.files;
                    if (!commitFiles) {
                        moreFiles = false;
                        break;
                    }
                    files.push(...commitFiles.map(f => { var _a; return (_a = f.filename) !== null && _a !== void 0 ? _a : ''; }));
                    // < 300 files means we hit the end
                    // page === 10 means we're at 3000 and that's the limit GH is gonna
                    // cough up anyway.
                    if (commitFiles.length < 300 || page === 10) {
                        moreFiles = false;
                        break;
                    }
                    page++;
                }
                ret.push({ sha: ref, message, files });
            }
            return ret;
        });
        /**
         * Find the SHA of the commit at the provided tag.
         *
         * @param {string} name Tag name
         * @returns {string} The SHA of the commit
         * @throws {GitHubAPIError} on an API error
         */
        this.getTagSha = wrapAsync(async (name) => {
            const refResponse = (await this.request('GET /repos/:owner/:repo/git/refs/tags/:name', {
                owner: this.owner,
                repo: this.repo,
                name,
            }));
            return refResponse.data.object.sha;
        });
        this.allTags = wrapAsync(async (prefix) => {
            // If we've fallen back to using allTags, support "-", "@", and "/" as a
            // suffix separating the library name from the version #. This allows
            // a repository to be seamlessly be migrated from a tool like lerna:
            const prefixes = [];
            if (prefix) {
                prefix = prefix.substring(0, prefix.length - 1);
                for (const suffix of ['-', '@', '/']) {
                    prefixes.push(`${prefix}${suffix}`);
                }
            }
            const tags = {};
            for await (const response of this.octokit.paginate.iterator(this.decoratePaginateOpts({
                method: 'GET',
                url: `/repos/${this.owner}/${this.repo}/tags?per_page=100`,
            }))) {
                response.data.forEach(data => {
                    // For monorepos, a prefix can be provided, indicating that only tags
                    // matching the prefix should be returned:
                    if (!isReposListResponse(data))
                        return;
                    let version = data.name;
                    if (prefix) {
                        let match = false;
                        for (prefix of prefixes) {
                            if (data.name.startsWith(prefix)) {
                                version = data.name.replace(prefix, '');
                                match = true;
                            }
                        }
                        if (!match)
                            return;
                    }
                    if (semver.valid(version)) {
                        version = semver.valid(version);
                        tags[version] = { sha: data.commit.sha, name: data.name, version };
                    }
                });
            }
            return tags;
        });
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
        this.findMergedPullRequests = wrapAsync(async (targetBranch, page = 1, perPage = 100) => {
            if (!targetBranch) {
                targetBranch = await this.getDefaultBranch();
            }
            // TODO: is sorting by updated better?
            const pullsResponse = (await this.request(`GET /repos/:owner/:repo/pulls?state=closed&per_page=${perPage}&page=${page}&base=${targetBranch}&sort=created&direction=desc`, {
                owner: this.owner,
                repo: this.repo,
            }));
            // TODO: distinguish between no more pages and a full page of
            // closed, non-merged pull requests. At page size of 100, this unlikely
            // to matter
            if (!pullsResponse.data) {
                return [];
            }
            return (pullsResponse.data
                // only return merged pull requests
                .filter(pull => {
                return !!pull.merged_at;
            })
                .map(pull => {
                const labels = pull.labels
                    ? pull.labels.map(l => {
                        return l.name + '';
                    })
                    : [];
                return {
                    sha: pull.merge_commit_sha,
                    number: pull.number,
                    baseRefName: pull.base.ref,
                    headRefName: pull.head.ref,
                    labels,
                    title: pull.title,
                    body: pull.body + '',
                };
            }));
        });
        /**
         * Find an existing release pull request with a matching title and labels
         *
         * @param {string} title Substring to match against the issue title
         * @param {string[]} labels List of labels to match the issues
         * @return {IssuesListResponseItem|undefined}
         * @throws {AuthError} if the user is not authenticated to make this request
         * @throws {GitHubAPIError} on other API errors
         */
        this.findExistingReleaseIssue = wrapAsync(async (title, labels) => {
            for await (const response of this.octokit.paginate.iterator(this.decoratePaginateOpts({
                method: 'GET',
                url: `/repos/${this.owner}/${this.repo}/issues?labels=${labels.join(',')}`,
                per_page: 100,
            }))) {
                for (let i = 0; response.data[i] !== undefined; i++) {
                    const issue = response.data[i];
                    if (issue.title.indexOf(title) !== -1 && issue.state === 'open') {
                        return issue;
                    }
                }
            }
            return undefined;
        }, e => {
            if (e instanceof request_error_1.RequestError && e.status === 404) {
                // the most likely cause of a 404 during this step is actually
                // that the user does not have access to the repo:
                throw new errors_1.AuthError(e);
            }
        });
        /**
         * Open a pull request
         *
         * @param {GitHubPR} options The pull request options
         * @throws {GitHubAPIError} on an API error
         */
        this.openPR = wrapAsync(async (options) => {
            var _a;
            const defaultBranch = await this.getDefaultBranch();
            // check if there's an existing PR, so that we can opt to update it
            // rather than creating a new PR.
            const refName = `refs/heads/${options.branch}`;
            let openReleasePR;
            const releasePRCandidates = await this.findOpenReleasePRs(options.labels);
            for (const releasePR of releasePRCandidates) {
                if (refName && refName.includes(releasePR.head.ref)) {
                    openReleasePR = releasePR;
                    break;
                }
            }
            // Short-circuit if there have been no changes to the pull-request body.
            if (openReleasePR && openReleasePR.body === options.body) {
                logger_1.logger.info(`PR https://github.com/${this.owner}/${this.repo}/pull/${openReleasePR.number} remained the same`);
                return undefined;
            }
            //  Update the files for the release if not already supplied
            const changes = (_a = options.changes) !== null && _a !== void 0 ? _a : (await this.getChangeSet(options.updates, defaultBranch));
            const prNumber = await code_suggester_1.createPullRequest(this.octokit, changes, {
                upstreamOwner: this.owner,
                upstreamRepo: this.repo,
                title: options.title,
                branch: options.branch,
                description: options.body,
                primary: defaultBranch,
                force: true,
                fork: this.fork,
                message: options.title,
                logger: logger_1.logger,
            });
            // If a release PR was already open, update the title and body:
            if (openReleasePR) {
                logger_1.logger.info(`update pull-request #${openReleasePR.number}: ${chalk.yellow(options.title)}`);
                await this.request('PATCH /repos/:owner/:repo/pulls/:pull_number', {
                    pull_number: openReleasePR.number,
                    owner: this.owner,
                    repo: this.repo,
                    title: options.title,
                    body: options.body,
                    state: 'open',
                });
                return openReleasePR.number;
            }
            else {
                return prNumber;
            }
        });
        /**
         * Returns the repository's default/primary branch.
         *
         * @returns {string}
         * @throws {GitHubAPIError} on an API error
         */
        this.getRepositoryDefaultBranch = wrapAsync(async () => {
            if (this.repositoryDefaultBranch) {
                return this.repositoryDefaultBranch;
            }
            const { data } = await this.octokit.repos.get({
                repo: this.repo,
                owner: this.owner,
                headers: {
                    Authorization: `token ${this.token}`,
                },
            });
            this.repositoryDefaultBranch = data.default_branch;
            return this.repositoryDefaultBranch;
        });
        /**
         * Close a pull request
         *
         * @param {number} prNumber The pull request number
         * @returns {boolean} Whether the request was attempts
         * @throws {GitHubAPIError} on an API error
         */
        this.closePR = wrapAsync(async (prNumber) => {
            if (this.fork)
                return false;
            await this.request('PATCH /repos/:owner/:repo/pulls/:pull_number', {
                owner: this.owner,
                repo: this.repo,
                pull_number: prNumber,
                state: 'closed',
            });
            return true;
        });
        /**
         * Fetch the contents of a file with the Contents API
         *
         * @param {string} path The path to the file in the repository
         * @param {string} branch The branch to fetch from
         * @returns {GitHubFileContents}
         * @throws {GitHubAPIError} on other API errors
         */
        this.getFileContentsWithSimpleAPI = wrapAsync(async (path, ref, isBranch = true) => {
            ref = isBranch ? GitHub.fullyQualifyBranchRef(ref) : ref;
            const options = {
                owner: this.owner,
                repo: this.repo,
                path,
                ref,
            };
            const resp = await this.request('GET /repos/:owner/:repo/contents/:path', options);
            return {
                parsedContent: Buffer.from(resp.data.content, 'base64').toString('utf8'),
                content: resp.data.content,
                sha: resp.data.sha,
            };
        });
        /**
         * Fetch the contents of a file
         *
         * @param {string} path The path to the file in the repository
         * @param {string} branch The branch to fetch from
         * @returns {GitHubFileContents}
         * @throws {GitHubAPIError} on other API errors
         */
        this.getFileContentsOnBranch = wrapAsync(async (path, branch) => {
            try {
                return await this.getFileContentsWithSimpleAPI(path, branch);
            }
            catch (err) {
                if (err.status === 403) {
                    return await this.getFileContentsWithDataAPI(path, branch);
                }
                throw err;
            }
        });
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
        this.createRelease = wrapAsync(async (packageName, tagName, sha, releaseNotes, draft) => {
            logger_1.logger.info(`creating release ${tagName}`);
            const name = packageName ? `${packageName} ${tagName}` : tagName;
            return (await this.request('POST /repos/:owner/:repo/releases', {
                owner: this.owner,
                repo: this.repo,
                tag_name: tagName,
                target_commitish: sha,
                body: releaseNotes,
                name,
                draft: draft,
            })).data;
        }, e => {
            if (e instanceof request_error_1.RequestError) {
                if (e.status === 422 &&
                    errors_1.GitHubAPIError.parseErrors(e).some(error => {
                        return error.code === 'already_exists';
                    })) {
                    throw new errors_1.DuplicateReleaseError(e, 'tagName');
                }
            }
        });
        /**
         * Remove labels from an issue or pull request
         *
         * @param {string[]} labels The names of the labels to remove
         * @param {number} prNumber The issue or pull request number
         * @return {boolean} Whether or not the request was attempted
         * @throws {GitHubAPIError} on an API error
         */
        this.removeLabels = wrapAsync(async (labels, prNumber) => {
            if (this.fork)
                return false;
            for (let i = 0, label; i < labels.length; i++) {
                label = labels[i];
                logger_1.logger.info(`removing label ${chalk.green(label)} from ${chalk.green('' + prNumber)}`);
                await this.request('DELETE /repos/:owner/:repo/issues/:issue_number/labels/:name', {
                    owner: this.owner,
                    repo: this.repo,
                    issue_number: prNumber,
                    name: label,
                });
            }
            return true;
        });
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
        this.findFilesByFilenameAndRef = wrapAsync(async (filename, ref, prefix) => {
            if (prefix) {
                prefix = this.normalizePrefix(prefix);
            }
            const response = await this.octokit.git.getTree({
                owner: this.owner,
                repo: this.repo,
                tree_sha: ref,
                recursive: 'true',
            });
            return response.data.tree
                .filter(file => {
                const path = file.path;
                return (path &&
                    // match the filename
                    path.endsWith(filename) &&
                    // match the prefix if provided
                    (!prefix || path.startsWith(prefix)));
            })
                .map(file => {
                let path = file.path;
                // strip the prefix if provided
                if (prefix) {
                    const pfix = new RegExp(`^${prefix}[/\\\\]`);
                    path = path.replace(pfix, '');
                }
                return path;
            });
        });
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
        this.findFilesByExtensionAndRef = wrapAsync(async (extension, ref, prefix) => {
            if (prefix) {
                prefix = this.normalizePrefix(prefix);
            }
            const response = await this.octokit.git.getTree({
                owner: this.owner,
                repo: this.repo,
                tree_sha: ref,
                recursive: 'true',
            });
            return response.data.tree
                .filter(file => {
                const path = file.path;
                return (path &&
                    // match the file extension
                    path.endsWith(`.${extension}`) &&
                    // match the prefix if provided
                    (!prefix || path.startsWith(prefix)));
            })
                .map(file => {
                let path = file.path;
                // strip the prefix if provided
                if (prefix) {
                    const pfix = new RegExp(`^${prefix}[/\\\\]`);
                    path = path.replace(pfix, '');
                }
                return path;
            });
        });
        /**
         * Makes a comment on a issue/pull request.
         *
         * @param {string} comment - The body of the comment to post.
         * @param {number} number - The issue or pull request number.
         * @throws {GitHubAPIError} on an API error
         */
        this.commentOnIssue = wrapAsync(async (comment, number) => {
            logger_1.logger.info(`adding comment to https://github.com/${this.owner}/${this.repo}/issue/${number}`);
            return (await this.request('POST /repos/:owner/:repo/issues/:issue_number/comments', {
                owner: this.owner,
                repo: this.repo,
                issue_number: number,
                body: comment,
            })).data;
        });
        this.defaultBranch = options.defaultBranch;
        this.token = options.token;
        this.owner = options.owner;
        this.repo = options.repo;
        this.fork = !!options.fork;
        this.apiUrl = options.apiUrl || constants_1.GH_API_URL;
        if (options.octokitAPIs === undefined) {
            this.octokit = new rest_1.Octokit({
                baseUrl: options.apiUrl,
                auth: this.token,
            });
            const defaults = {
                baseUrl: this.apiUrl,
                headers: {
                    'user-agent': `${constants_1.RELEASE_PLEASE}/${require('../../package.json').version}`,
                    Authorization: `token ${this.token}`,
                },
            };
            this.request = request_1.request.defaults(defaults);
            this.graphql = graphql_1.graphql;
        }
        else {
            // for the benefit of probot applications, we allow a configured instance
            // of octokit to be passed in as a parameter.
            probotMode = true;
            this.octokit = options.octokitAPIs.octokit;
            this.request = options.octokitAPIs.request;
            this.graphql = options.octokitAPIs.graphql;
        }
    }
    async makeGraphqlRequest(_opts) {
        let opts = Object.assign({}, _opts);
        if (!probotMode) {
            opts = Object.assign(opts, {
                url: `${this.apiUrl}/graphql`,
                headers: {
                    authorization: `token ${this.token}`,
                    'content-type': 'application/vnd.github.v3+json',
                },
            });
        }
        return this.graphql(opts);
    }
    decoratePaginateOpts(opts) {
        if (probotMode) {
            return opts;
        }
        else {
            return Object.assign(opts, {
                headers: {
                    Authorization: `token ${this.token}`,
                },
            });
        }
    }
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
    async commitsSinceSha(sha, perPage = 100, labels = false, path = null) {
        const commits = [];
        const method = labels ? 'commitsWithLabels' : 'commitsWithFiles';
        let cursor;
        for (;;) {
            const commitsResponse = await this[method](cursor, perPage, path);
            for (let i = 0, commit; i < commitsResponse.commits.length; i++) {
                commit = commitsResponse.commits[i];
                if (commit.sha === sha) {
                    return commits;
                }
                else {
                    commits.push(commit);
                }
            }
            if (commitsResponse.hasNextPage === false || !commitsResponse.endCursor) {
                return commits;
            }
            else {
                cursor = commitsResponse.endCursor;
            }
        }
    }
    async commitsWithFiles(cursor = undefined, perPage = 32, path = null, maxFilesChanged = 64) {
        const baseBranch = await this.getDefaultBranch();
        // The GitHub v3 API does not offer an elegant way to fetch commits
        // in conjucntion with the path that they modify. We lean on the graphql
        // API for this one task, fetching commits in descending chronological
        // order along with the file paths attached to them.
        const response = await this.graphqlRequest({
            query: `query commitsWithFiles($cursor: String, $owner: String!, $repo: String!, $baseRef: String!, $perPage: Int, $maxFilesChanged: Int, $path: String) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $baseRef) {
            target {
              ... on Commit {
                history(first: $perPage, after: $cursor, path: $path) {
                  edges {
                    node {
                      ... on Commit {
                        message
                        oid
                        associatedPullRequests(first: 1) {
                          edges {
                            node {
                              ... on PullRequest {
                                number
                                mergeCommit {
                                  oid
                                }
                                files(first: $maxFilesChanged) {
                                  edges {
                                    node {
                                      path
                                    }
                                  }
                                  pageInfo {
                                    endCursor
                                    hasNextPage
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          }
        }
      }`,
            cursor,
            maxFilesChanged,
            owner: this.owner,
            path,
            perPage,
            repo: this.repo,
            baseRef: `refs/heads/${baseBranch}`,
        }, 3);
        return graphql_to_commits_1.graphqlToCommits(this, response);
    }
    async commitsWithLabels(cursor = undefined, perPage = 32, path = null, maxLabels = 16) {
        const baseBranch = await this.getDefaultBranch();
        const response = await this.graphqlRequest({
            query: `query commitsWithLabels($cursor: String, $owner: String!, $repo: String!, $baseRef: String!, $perPage: Int, $maxLabels: Int, $path: String) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $baseRef) {
            target {
              ... on Commit {
                history(first: $perPage, after: $cursor, path: $path) {
                  edges {
                    node {
                      ... on Commit {
                        message
                        oid
                        associatedPullRequests(first: 1) {
                          edges {
                            node {
                              ... on PullRequest {
                                number
                                mergeCommit {
                                  oid
                                }
                                labels(first: $maxLabels) {
                                  edges {
                                    node {
                                      name
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          }
        }
      }`,
            cursor,
            maxLabels,
            owner: this.owner,
            path,
            perPage,
            repo: this.repo,
            baseRef: `refs/heads/${baseBranch}`,
        }, 3);
        return graphql_to_commits_1.graphqlToCommits(this, response);
    }
    /**
     * Return the pull request files
     *
     * @param {number} num Pull request number
     * @param {string} cursor Pagination cursor
     * @param {number} maxFilesChanged Number of files to return per page
     * @return {PREdge}
     * @throws {GitHubAPIError} on an API error
     */
    async pullRequestFiles(num, cursor, maxFilesChanged = 100) {
        // Used to handle the edge-case in which a PR has more than 100
        // modified files attached to it.
        const response = await this.graphqlRequest({
            query: `query pullRequestFiles($cursor: String, $owner: String!, $repo: String!, $maxFilesChanged: Int, $num: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $num) {
              number
              files(first: $maxFilesChanged, after: $cursor) {
                edges {
                  node {
                    path
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }`,
            cursor,
            maxFilesChanged,
            owner: this.owner,
            repo: this.repo,
            num,
        });
        return { node: response.repository.pullRequest };
    }
    /**
     * Find the "last" merged PR given a headBranch. "last" here means
     * the most recently created. Includes all associated files.
     *
     * @param {string} headBranch - e.g. "release-please/branches/main"
     * @returns {MergedGitHubPRWithFiles} - if found, otherwise undefined.
     * @throws {GitHubAPIError} on an API error
     */
    async lastMergedPRByHeadBranch(headBranch) {
        const baseBranch = await this.getDefaultBranch();
        const response = await this.graphqlRequest({
            query: `query lastMergedPRByHeadBranch($owner: String!, $repo: String!, $baseBranch: String!, $headBranch: String!) {
          repository(owner: $owner, name: $repo) {
            pullRequests(baseRefName: $baseBranch, states: MERGED, orderBy: {field: CREATED_AT, direction: DESC}, first: 1, headRefName: $headBranch) {
            nodes {
              title
              body
              number
              mergeCommit {
                oid
              }
              files(first: 100) {
                nodes {
                  path
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
              labels(first: 10) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }`,
            owner: this.owner,
            repo: this.repo,
            baseBranch,
            headBranch,
        });
        let result = undefined;
        const pr = response.repository.pullRequests.nodes[0];
        if (pr) {
            const files = pr.files.nodes.map(({ path }) => path);
            let hasMoreFiles = pr.files.pageInfo.hasNextPage;
            let cursor = pr.files.pageInfo.endCursor;
            while (hasMoreFiles) {
                const next = await this.pullRequestFiles(pr.number, cursor);
                const nextFiles = next.node.files.edges.map(fe => fe.node.path);
                files.push(...nextFiles);
                cursor = next.node.files.pageInfo.endCursor;
                hasMoreFiles = next.node.files.pageInfo.hasNextPage;
            }
            result = {
                sha: pr.mergeCommit.oid,
                title: pr.title,
                body: pr.body,
                number: pr.number,
                baseRefName: baseBranch,
                headRefName: headBranch,
                files,
                labels: pr.labels.nodes.map(({ name }) => name),
            };
        }
        return result;
    }
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
    async latestTagFallback(prefix, preRelease = false) {
        const tags = await this.allTags(prefix);
        const versions = Object.keys(tags).filter(t => {
            // remove any pre-releases from the list:
            return preRelease || !t.includes('-');
        });
        // no tags have been created yet.
        if (versions.length === 0)
            return undefined;
        // We use a slightly modified version of semver's sorting algorithm, which
        // prefixes the numeric part of a pre-release with '0's, so that
        // 010 is greater than > 002.
        versions.sort((v1, v2) => {
            if (v1.includes('-')) {
                const [prefix, suffix] = v1.split('-');
                v1 = prefix + '-' + suffix.replace(/[a-zA-Z.]/, '').padStart(6, '0');
            }
            if (v2.includes('-')) {
                const [prefix, suffix] = v2.split('-');
                v2 = prefix + '-' + suffix.replace(/[a-zA-Z.]/, '').padStart(6, '0');
            }
            return semver.rcompare(v1, v2);
        });
        return {
            name: tags[versions[0]].name,
            sha: tags[versions[0]].sha,
            version: tags[versions[0]].version,
        };
    }
    async mergeCommitsGraphQL(cursor) {
        const targetBranch = await this.getDefaultBranch();
        const response = await this.graphqlRequest({
            query: `query pullRequestsSince($owner: String!, $repo: String!, $num: Int!, $targetBranch: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $targetBranch) {
            target {
              ... on Commit {
                history(first: $num, after: $cursor) {
                  nodes {
                    associatedPullRequests(first: 10) {
                      nodes {
                        number
                        title
                        baseRefName
                        headRefName
                        labels(first: 10) {
                          nodes {
                            name
                          }
                        }
                        body
                        mergeCommit {
                          oid
                        }
                      }
                    }
                    sha: oid
                    message
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        }
      }`,
            cursor,
            owner: this.owner,
            repo: this.repo,
            num: 25,
            targetBranch,
        });
        // if the branch does exist, return null
        if (!response.repository.ref) {
            logger_1.logger.warn(`Could not find commits for branch ${targetBranch} - it likely does not exist.`);
            return null;
        }
        const history = response.repository.ref.target.history;
        const commits = (history.nodes || []);
        return {
            pageInfo: history.pageInfo,
            data: commits.map(graphCommit => {
                const commit = {
                    sha: graphCommit.sha,
                    message: graphCommit.message,
                    files: [],
                };
                const pullRequest = graphCommit.associatedPullRequests.nodes.find(pr => {
                    return pr.mergeCommit && pr.mergeCommit.oid === graphCommit.sha;
                });
                if (pullRequest) {
                    return {
                        commit,
                        pullRequest: {
                            sha: commit.sha,
                            number: pullRequest.number,
                            baseRefName: pullRequest.baseRefName,
                            headRefName: pullRequest.headRefName,
                            title: pullRequest.title,
                            body: pullRequest.body,
                            labels: pullRequest.labels.nodes.map(node => node.name),
                        },
                    };
                }
                return {
                    commit,
                };
            }),
        };
    }
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
    async findMergeCommit(filter, maxResults = Number.MAX_SAFE_INTEGER) {
        const generator = this.mergeCommitIterator(maxResults);
        for await (const commitWithPullRequest of generator) {
            if (filter(commitWithPullRequest.commit, commitWithPullRequest.pullRequest)) {
                return commitWithPullRequest;
            }
        }
        return undefined;
    }
    /**
     * Iterate through commit history with a max number of results scanned.
     *
     * @param maxResults {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @yields {CommitWithPullRequest}
     * @throws {GitHubAPIError} on an API error
     */
    async *mergeCommitIterator(maxResults = Number.MAX_SAFE_INTEGER) {
        let cursor = undefined;
        let results = 0;
        while (results < maxResults) {
            const response = await this.mergeCommitsGraphQL(cursor);
            // no response usually means that the branch can't be found
            if (!response) {
                break;
            }
            for (let i = 0; i < response.data.length; i++) {
                results += 1;
                yield response.data[i];
            }
            if (!response.pageInfo.hasNextPage) {
                break;
            }
            cursor = response.pageInfo.endCursor;
        }
    }
    /**
     * Iterate through merged pull requests with a max number of results scanned.
     *
     * @param maxResults {number} maxResults - Limit the number of results searched.
     *   Defaults to unlimited.
     * @yields {MergedGitHubPR}
     * @throws {GitHubAPIError} on an API error
     */
    async *mergedPullRequestIterator(branch, maxResults = Number.MAX_SAFE_INTEGER) {
        let page = 1;
        const results = 0;
        while (results < maxResults) {
            const pullRequests = await this.findMergedPullRequests(branch, page);
            // no response usually means we ran out of results
            if (pullRequests.length === 0) {
                break;
            }
            for (let i = 0; i < pullRequests.length; i++) {
                yield pullRequests[i];
            }
            page += 1;
        }
    }
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
    async commitsSince(filter, maxResults = Number.MAX_SAFE_INTEGER) {
        const commits = [];
        const generator = this.mergeCommitIterator(maxResults);
        for await (const commitWithPullRequest of generator) {
            if (filter(commitWithPullRequest.commit, commitWithPullRequest.pullRequest)) {
                break;
            }
            commits.push(commitWithPullRequest.commit);
        }
        return commits;
    }
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
    async findMergedPullRequest(targetBranch, filter, maxResults = Number.MAX_SAFE_INTEGER) {
        const generator = this.mergedPullRequestIterator(targetBranch, maxResults);
        for await (const mergedPullRequest of generator) {
            if (filter(mergedPullRequest)) {
                return mergedPullRequest;
            }
        }
        return undefined;
    }
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
    async findMergedReleasePR(labels, branchPrefix = undefined, preRelease = true, maxResults = Number.MAX_SAFE_INTEGER) {
        branchPrefix = (branchPrefix === null || branchPrefix === void 0 ? void 0 : branchPrefix.endsWith('-')) ? branchPrefix.replace(/-$/, '')
            : branchPrefix;
        const targetBranch = await this.getDefaultBranch();
        const mergedReleasePullRequest = await this.findMergedPullRequest(targetBranch, mergedPullRequest => {
            // If labels specified, ensure the pull request has all the specified labels
            if (labels.length > 0 &&
                !this.hasAllLabels(labels, mergedPullRequest.labels)) {
                return false;
            }
            const branchName = branch_name_1.BranchName.parse(mergedPullRequest.headRefName);
            if (!branchName) {
                return false;
            }
            // If branchPrefix is specified, ensure it is found in the branch name.
            // If branchPrefix is not specified, component should also be undefined.
            if (branchName.getComponent() !== branchPrefix) {
                return false;
            }
            // In this implementation we expect to have a release version
            const version = branchName.getVersion();
            if (!version) {
                return false;
            }
            // What's left by now should just be the version string.
            // Check for pre-releases if needed.
            if (!preRelease && version.indexOf('-') >= 0) {
                return false;
            }
            // Make sure we did get a valid semver.
            const normalizedVersion = semver.valid(version);
            if (!normalizedVersion) {
                return false;
            }
            return true;
        }, maxResults);
        return mergedReleasePullRequest;
    }
    hasAllLabels(labelsA, labelsB) {
        let hasAll = true;
        labelsA.forEach(label => {
            if (labelsB.indexOf(label) === -1)
                hasAll = false;
        });
        return hasAll;
    }
    /**
     * Find open pull requests with matching labels.
     *
     * @param {string[]} labels List of labels to match
     * @param {number} perPage Optional. Defaults to 100
     * @return {PullsListResponseItems} Pull requests
     * @throws {GitHubAPIError} on an API error
     */
    async findOpenReleasePRs(labels, perPage = 100) {
        const baseLabel = await this.getBaseLabel();
        const openReleasePRs = [];
        const pullsResponse = (await this.request(`GET /repos/:owner/:repo/pulls?state=open&per_page=${perPage}`, {
            owner: this.owner,
            repo: this.repo,
        }));
        for (const pull of pullsResponse.data) {
            // Verify that this PR was based against our base branch of interest.
            if (!pull.base || pull.base.label !== baseLabel)
                continue;
            let hasAllLabels = false;
            const observedLabels = pull.labels.map(l => l.name);
            for (const expectedLabel of labels) {
                if (observedLabels.includes(expectedLabel)) {
                    hasAllLabels = true;
                }
                else {
                    hasAllLabels = false;
                    break;
                }
            }
            if (hasAllLabels)
                openReleasePRs.push(pull);
        }
        return openReleasePRs;
    }
    /**
     * Add labels to an issue or pull request
     *
     * @param {string[]} labels List of labels to add
     * @param {number} pr Issue or pull request number
     * @return {boolean} Whether or not the labels were added
     * @throws {GitHubAPIError} on an API error
     */
    async addLabels(labels, pr) {
        // If the PR is being created from a fork, it will not have permission
        // to add and remove labels from the PR:
        if (this.fork) {
            logger_1.logger.warn('release labels were not added, due to PR being created from fork');
            return false;
        }
        logger_1.logger.info(`adding label ${chalk.green(labels.join(','))} to https://github.com/${this.owner}/${this.repo}/pull/${pr}`);
        await this.request('POST /repos/:owner/:repo/issues/:issue_number/labels', {
            owner: this.owner,
            repo: this.repo,
            issue_number: pr,
            labels,
        });
        return true;
    }
    /**
     * Given a set of proposed updates, build a changeset to suggest.
     *
     * @param {Update[]} updates The proposed updates
     * @param {string} defaultBranch The target branch
     * @return {Changes} The changeset to suggest.
     * @throws {GitHubAPIError} on an API error
     */
    async getChangeSet(updates, defaultBranch) {
        const changes = new Map();
        for (const update of updates) {
            let content;
            try {
                if (update.contents) {
                    // we already loaded the file contents earlier, let's not
                    // hit GitHub again.
                    content = { data: update.contents };
                }
                else {
                    const fileContent = await this.getFileContentsOnBranch(update.path, defaultBranch);
                    content = { data: fileContent };
                }
            }
            catch (err) {
                if (err.status !== 404)
                    throw err;
                // if the file is missing and create = false, just continue
                // to the next update, otherwise create the file.
                if (!update.create) {
                    logger_1.logger.warn(`file ${chalk.green(update.path)} did not exist`);
                    continue;
                }
            }
            const contentText = content
                ? Buffer.from(content.data.content, 'base64').toString('utf8')
                : undefined;
            const updatedContent = update.updateContent(contentText);
            if (updatedContent) {
                changes.set(update.path, {
                    content: updatedContent,
                    mode: '100644',
                });
            }
        }
        return changes;
    }
    // The base label is basically the default branch, attached to the owner.
    async getBaseLabel() {
        const baseBranch = await this.getDefaultBranch();
        return `${this.owner}:${baseBranch}`;
    }
    /**
     * Returns the branch we are targetting for releases. Defaults
     * to the repository's default/primary branch.
     *
     * @returns {string}
     * @throws {GitHubAPIError} on an API error
     */
    async getDefaultBranch() {
        if (!this.defaultBranch) {
            this.defaultBranch = await this.getRepositoryDefaultBranch();
        }
        return this.defaultBranch;
    }
    // Takes a potentially unqualified branch name, and turns it
    // into a fully qualified ref.
    //
    // e.g. main -> refs/heads/main
    static fullyQualifyBranchRef(refName) {
        let final = refName;
        if (final.indexOf('/') < 0) {
            final = `refs/heads/${final}`;
        }
        return final;
    }
    /**
     * Fetch the contents of a file using the Git data API
     *
     * @param {string} path The path to the file in the repository
     * @param {string} branch The branch to fetch from
     * @returns {GitHubFileContents}
     * @throws {GitHubAPIError} on other API errors
     */
    async getFileContentsWithDataAPI(path, branch) {
        const options = {
            owner: this.owner,
            repo: this.repo,
            branch,
        };
        const repoTree = await this.request('GET /repos/:owner/:repo/git/trees/:branch', options);
        const blobDescriptor = repoTree.data.tree.find(tree => tree.path === path);
        if (!blobDescriptor) {
            throw new Error(`Could not find requested path: ${path}`);
        }
        const resp = await this.request('GET /repos/:owner/:repo/git/blobs/:sha', {
            owner: this.owner,
            repo: this.repo,
            sha: blobDescriptor.sha,
        });
        return {
            parsedContent: Buffer.from(resp.data.content, 'base64').toString('utf8'),
            content: resp.data.content,
            sha: resp.data.sha,
        };
    }
    /**
     * Fetch the contents of a file from the configured branch
     *
     * @param {string} path The path to the file in the repository
     * @returns {GitHubFileContents}
     * @throws {GitHubAPIError} on other API errors
     */
    async getFileContents(path) {
        return await this.getFileContentsOnBranch(path, await this.getDefaultBranch());
    }
    normalizePrefix(prefix) {
        return prefix.replace(/^[/\\]/, '').replace(/[/\\]$/, '');
    }
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
    async findFilesByFilename(filename, prefix) {
        return this.findFilesByFilenameAndRef(filename, await this.getDefaultBranch(), prefix);
    }
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
    async findFilesByExtension(extension, prefix) {
        return this.findFilesByExtensionAndRef(extension, await this.getDefaultBranch(), prefix);
    }
}
exports.GitHub = GitHub;
/**
 * Wrap an async method with error handling
 *
 * @param fn Async function that can throw Errors
 * @param errorHandler An optional error handler for rethrowing custom exceptions
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const wrapAsync = (fn, errorHandler) => {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (e) {
            if (errorHandler) {
                errorHandler(e);
            }
            if (e instanceof request_error_1.RequestError) {
                throw new errors_1.GitHubAPIError(e);
            }
            throw e;
        }
    };
};
//# sourceMappingURL=github.js.map