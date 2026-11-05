const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
let server;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
      catch { res.writeHead(400); res.end('Bad request'); return; }
      const requested = pathname === '/' ? '/index.html' : pathname;
      const target = path.resolve(projectRoot, `.${requested}`);
      if (!target.startsWith(projectRoot + path.sep) && target !== path.join(projectRoot, 'index.html')) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      fs.readFile(target, (error, data) => {
        if (error) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

app.whenReady().then(async () => {
  const port = await startLocalServer();
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 650,
    backgroundColor: '#090a10', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  await win.loadURL(`http://127.0.0.1:${port}`);
  win.on('closed', () => server?.close());
});

app.on('window-all-closed', () => { server?.close(); if (process.platform !== 'darwin') app.quit(); });
