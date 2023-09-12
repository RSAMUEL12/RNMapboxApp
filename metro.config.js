const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');

// eslint-disable-next-line no-undef
const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig);
