const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 添加对 .cjs 文件的支持
config.resolver.sourceExts.push('cjs');

module.exports = config;
