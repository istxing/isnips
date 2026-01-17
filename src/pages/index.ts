import React from 'react';
import { createRoot } from 'react-dom/client';
import Library from './Library';
import '../styles/main.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(Library));
}
