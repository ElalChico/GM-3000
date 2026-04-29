const { execSync } = require('child_process');

module.exports = async (forgeConfig, buildPath) => {
  console.log('Installing express in build path:', buildPath);
  try {
    execSync('npm install express --omit=dev --no-bin-links', { cwd: buildPath, stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to install express in packaged app:', error);
  }
};
