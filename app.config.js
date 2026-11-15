// Settings from app.json, plus the Firebase file for Android push
// notifications once it's added (see PLAY_STORE.md). Without the file the
// app still builds; push just won't reach Android phones.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const android = { ...config.android };
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    android.googleServicesFile = './google-services.json';
  }
  return { ...config, android };
};
