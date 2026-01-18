import React from 'react';
import { createRoot } from 'react-dom/client';
import Library from './Library';
import { I18nProvider } from '../hooks/useI18n';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    React.createElement(I18nProvider, null,
      React.createElement(Library, null)
    )
  );
}
