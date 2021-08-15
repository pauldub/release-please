import { ManifestPlugin } from './plugin';
import { GitHub } from '../github';
import { Config } from '../manifest';
export declare type PluginType = 'node-workspace' | 'cargo-workspace';
export declare function getPlugin(pluginType: PluginType, github: GitHub, config: Config): ManifestPlugin;
