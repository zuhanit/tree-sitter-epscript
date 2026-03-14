const http = require('http');
const fs = require('fs');
const path = require('path');
const koffi = require('koffi');

const DYLIB_PATH = path.resolve(__dirname, './libepScriptLib.dylib');

const lib = koffi.load(DYLIB_PATH);
const compileString = lib.func('const char* compileString(const char* filename, const char* rawcode)');
const freeCompiledResult = lib.func('void freeCompiledResult(const char* str)');
const getErrorCount = lib.func('int getErrorCount()');
const compileStringAST = lib.func('const char* compileStringAST(const char* filename, const char* rawcode)');

function handleCompile(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const { code } = JSON.parse(body);
    try {
      const result = compileString('input.eps', code ?? '');
      const errors = getErrorCount();
      if (result === null) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Compilation failed (${errors} error(s))` }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result, errors }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

function handleAST(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const { code } = JSON.parse(body);
    try {
      const json = compileStringAST('input.eps', code ?? '');
      if (json === null) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Parse failed' }));
        return;
      }
      // json is already a JSON array string — wrap it
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events: JSON.parse(json) }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/compile') return handleCompile(req, res);
  if (req.method === 'POST' && req.url === '/ast') return handleAST(req, res);

  // Serve static files
  const filePath = req.url === '/' ? '/index.html' : req.url;
  const ext = path.extname(filePath);
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const fullPath = path.join(__dirname, 'public', filePath);
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] ?? 'text/plain' });
    res.end(data);
  });
});

const PORT = 3737;
server.listen(PORT, () => {
  console.log(`epScript Playground → http://localhost:${PORT}`);
});
