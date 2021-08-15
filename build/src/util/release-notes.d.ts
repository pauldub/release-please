/**
 * Parse release notes for a specific release from the CHANGELOG contents
 *
 * @param {string} changelogContents The entire CHANGELOG contents
 * @param {string} version The release version to extract notes from
 */
export declare function extractReleaseNotes(changelogContents: string, version: string): string;
