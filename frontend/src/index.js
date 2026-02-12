import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; 
import App from './App'; 
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// This finds the '<div id="root">' element in your public/index.html file
const root = ReactDOM.createRoot(document.getElementById('root'));

// This tells React to render your main <App> component inside that div
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

serviceWorkerRegistration.register();