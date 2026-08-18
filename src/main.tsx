import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { installAccessibilityGuards } from './runtime/accessibilityGuards';
import './visuals/3d/installPerformanceRecovery';
import './index.css';

installAccessibilityGuards();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
