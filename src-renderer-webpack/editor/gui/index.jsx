import React from 'react';
import ReactDOM from 'react-dom';
import GUI from './gui.jsx';

import './media-device-chooser-impl.js';
import '../prompt/prompt.js';

const appTarget = document.getElementById('app');
document.body.classList.add('tw-loaded');
GUI.setAppElement(appTarget);

ReactDOM.render(<GUI />, appTarget);

require('./addons');

// AgentWarp: the agent panel (its own bundle, from the agentwarp checkout).
AgentWarpDesktop.getClient().then((code) => {
  if (!code) return;
  const script = document.createElement('script');
  script.textContent = code;
  document.body.appendChild(script);
});

EditorPreload.getAdvancedCustomizations().then(({userscript, userstyle}) => {
  if (userstyle) {
    const style = document.createElement('style');
    style.textContent = userstyle;
    document.body.appendChild(style);
  }

  if (userscript) {
    const script = document.createElement('script');
    script.textContent = userscript;
    document.body.appendChild(script);
  }
});
