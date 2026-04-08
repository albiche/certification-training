const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permet à Metro de bundler les fichiers CSV comme des assets
config.resolver.assetExts.push('csv');

module.exports = config;
