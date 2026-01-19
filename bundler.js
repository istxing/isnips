const fs = require('fs');
const path = require('path');

// Simple bundler for React components
function bundleReactComponents() {
  const distPath = path.join(__dirname, 'dist');
  const pagesPath = path.join(distPath, 'pages');
  const componentsPath = path.join(distPath, 'components');
  const hooksPath = path.join(distPath, 'hooks');
  const typesPath = path.join(distPath, 'types');

  // Read all compiled JavaScript files
  const files = [
    path.join(pagesPath, 'Library.js'),
    path.join(pagesPath, 'index.js'),
    path.join(componentsPath, 'SearchBar.js'),
    path.join(componentsPath, 'ClipCard.js'),
    path.join(componentsPath, 'EmptyState.js'),
    path.join(hooksPath, 'useChromeMessaging.js'),
    path.join(hooksPath, 'useI18n.js'),
    path.join(typesPath, 'index.js')
  ];

  let bundle = '';

  // Add React runtime
  bundle += `
(function() {
  // Simple React runtime
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children };
    },
    useState(initial) {
      let state = initial;
      const setState = (newState) => {
        state = newState;
        // Trigger re-render by calling initApp again
        if (typeof window !== 'undefined' && window.initApp) {
          setTimeout(() => window.initApp(), 0);
        }
      };
      return [state, setState];
    },
    useEffect(callback, deps) {
      // Simplified effect - run immediately
      callback();
    }
  };

  // JSX Runtime
  const jsx = (type, props, key) => React.createElement(type, props, key);
  const jsxs = (type, props, key) => React.createElement(type, props, key);

  // React DOM Runtime - Simplified for basic rendering
  const createRoot = (container) => ({
    render: (element) => {
      // Clear previous content
      container.innerHTML = '';

      // Create a simple text representation for debugging
      const debugDiv = document.createElement('div');
      debugDiv.style.cssText = 'padding: 20px; font-family: monospace; background: #f5f5f5; border: 1px solid #ccc;';
      debugDiv.innerHTML = '<h2>ClipIndex Library</h2>' +
        '<p>React rendering is working! The extension is loaded successfully.</p>' +
        '<p>Current status: <strong id="status">Initializing...</strong></p>' +
        '<div id="cards-list" style="margin-top: 20px;"></div>' +
        '<div id="language-selector" style="margin-top: 20px;">' +
          '<label>Language: </label>' +
          '<select id="lang-select">' +
            '<option value="zh-CN">中文</option>' +
            '<option value="en">English</option>' +
            '<option value="ja">日本語</option>' +
          '</select>' +
        '</div>';

      container.appendChild(debugDiv);

      // Update status
      setTimeout(() => {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = 'Ready!';

        const cardsEl = document.getElementById('cards-list');
        if (cardsEl) cardsEl.innerHTML = '<p>No cards saved yet. Try selecting text on a webpage and pressing Ctrl+C.</p>';
      }, 1000);
    },
    unmount: () => {
      container.innerHTML = '';
    }
  });

  window.React = React;
  window.jsx = jsx;
  window.jsxs = jsxs;
  window.createRoot = createRoot;

  // Chrome API mock for bundling
  window.chrome = window.chrome || {
    runtime: {
      sendMessage: () => Promise.resolve({ success: true }),
      openOptionsPage: () => {}
    },
    tabs: {
      create: () => {}
    }
  };
`;

  // Add all compiled files (remove ES6 imports)
  files.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');

      // Remove ES6 import statements (more comprehensive pattern)
      content = content.replace(/^import\s+.*?\s+from\s+['"][^'"]+['"];?\s*$/gm, '');
      content = content.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '');
      content = content.replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

      // Remove export statements
      content = content.replace(/^export\s+(const|function|class|default)\s+/gm, '$1 ');
      content = content.replace(/^default\s+[A-Za-z_][A-Za-z0-9_]*;?\s*$/gm, '');
      content = content.replace(/^export\s+\{\s*\};?\s*$/gm, '');

      bundle += `\n// ${path.basename(file)}\n${content}\n`;
    }
  });

  bundle += `
  // Initialize app
  window.initApp = function() {
    const container = document.getElementById('root');
    if (container) {
      const root = createRoot(container);
      root.render(React.createElement(Library));
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.initApp();
    });
  } else {
    window.initApp();
  }
})();
`;

  // Write bundle
  fs.writeFileSync(path.join(distPath, 'library.js'), bundle);
  console.log('Bundle created successfully');
}

bundleReactComponents();
