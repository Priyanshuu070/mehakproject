const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Resolve distribution directory (works whether run from MehakProject or vayro-site)
let distDir = path.resolve(__dirname, 'vayro-site', 'dist');
if (!fs.existsSync(distDir)) {
  distDir = path.resolve(__dirname, 'dist');
}
if (!fs.existsSync(distDir)) {
  distDir = path.resolve(__dirname);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

// Live reload client list
const clients = new Set();

const liveReloadScript = `
<script>
  (function() {
    const es = new EventSource('/__livereload');
    es.onmessage = function(e) {
      if (e.data === 'reload') {
        console.log('[LiveReload] Change detected, reloading page...');
        window.location.reload();
      }
    };
    es.onerror = function() {
      // Reconnect after brief pause
      setTimeout(() => new EventSource('/__livereload'), 2000);
    };
  })();
</script>
`;

// Watch dist folder for changes
let reloadDebounceTimer = null;
try {
  fs.watch(distDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    clearTimeout(reloadDebounceTimer);
    reloadDebounceTimer = setTimeout(() => {
      console.log(`[DevServer] Detected change in ${filename}, reloading clients...`);
      for (const res of clients) {
        res.write('data: reload\n\n');
      }
    }, 100);
  });
} catch (err) {
  console.warn('[DevServer] File watching disabled or not supported:', err.message);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // SSE endpoint for live reload
  if (pathname === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    res.write(': connected\n\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // Normalize path
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  let filePath = path.join(distDir, pathname);

  // If path has no extension and doesn't exist, try appending .html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    }
  }

  // Check if directory
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Check existence
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
    res.end('<h1>404 Not Found</h1><p>The requested file was not found.</p><p><a href="/">Return home</a></p>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Internal Server Error: ${err.message}`);
      return;
    }

    // Inject live reload script into HTML files
    if (ext === '.html') {
      let html = data.toString('utf-8');
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${liveReloadScript}\n</body>`);
      } else {
        html += liveReloadScript;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(html);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    }
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log('\n==================================================');
    console.log('  \x1b[32m✔ VAYRO Dev Server is running!\x1b[0m');
    console.log(`  > Local:   \x1b[36mhttp://localhost:${port}/\x1b[0m`);
    console.log(`  > Serving: ${distDir}`);
    console.log('  > Live Reload is active');
    console.log('==================================================\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
