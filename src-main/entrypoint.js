// It's very important that all error-handling code here be as minimal and
// self contained as possible to ensure that the error handling does not
// itself have errors.

const {app, dialog} = require('electron');

const APP_NAME = 'AgentWarp';
const stringifyError = (error) => (error && error.stack) ? error.stack : error;

// AgentWarp keeps its own settings, addons and projects, separate from an installed TurboWarp.
app.setName('AgentWarp');
app.setPath('userData', require('path').join(app.getPath('appData'), 'agentwarp-desktop'));

try {
  process.on('unhandledRejection', (error) => {
    console.error('Error in promise:', error);
    app.whenReady().then(() => {
      dialog.showMessageBoxSync({
        type: 'error',
        title: APP_NAME,
        message: `Error in promise: ${stringifyError(error)}`,
        noLink: true
      });
    });
  });

  require('./index');
} catch (error) {
  console.error('Error starting main process:', error);
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'error',
      title: APP_NAME,
      message: `Error starting main process: ${stringifyError(error)}`,
      noLink: true
    });
    app.exit(1);
  });
}
