// src/services/configService.js
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const configPath = path.join(__dirname, '../userconfig.yaml');

function loadUserConfig() {
    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        return yaml.load(fileContents);
    } catch (e) {
        console.error("Failed to load user config:", e);
        return null;
    }
}

function saveUserConfig(config) {
    try {
        const yamlStr = yaml.dump(config);
        fs.writeFileSync(configPath, yamlStr, 'utf8');
    } catch (e) {
        console.error("Failed to save user config:", e);
    }
}

module.exports = {
    loadUserConfig,
    saveUserConfig,
};
