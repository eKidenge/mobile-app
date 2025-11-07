const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support ESM/mjs files
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// Alias for @supabase/node-fetch to prevent dynamic import issues
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@supabase/node-fetch': path.resolve(__dirname, 'shims', 'node-fetch.js'),
};

// Ensure project-local node_modules resolution
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Optional: clear Metro transform cache on each build
config.resetCache = true;

module.exports = config;
