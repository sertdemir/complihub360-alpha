import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4173;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
};

// Nur Textformate profitieren; woff2/png/webp sind bereits komprimiert und
// wuerden durch gzip groesser statt kleiner.
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt']);

const server = http.createServer((req, res) => {
    console.log(`[REQ] ${req.method} ${req.url}`);

    // Clean URL path
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

    // Basic security, prevent directory traversal
    if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Verzeichnis -> dessen index.html. Seit dem SEO-Build (vite-plugin-seo)
    // liegt fuer jede Route ein eigenes dist/<locale>/<pfad>/index.html; ohne
    // diesen Schritt fand existsSync das VERZEICHNIS, und readFile darauf warf
    // EISDIR -> HTTP 500 auf jeder oeffentlichen URL.
    let stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (stat?.isDirectory()) {
        const candidate = path.join(filePath, 'index.html');
        if (fs.existsSync(candidate)) { filePath = candidate; stat = fs.statSync(filePath); }
        else stat = null;
    }
    // SPA fallback
    if (!stat) {
        filePath = path.join(DIST_DIR, 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
            return;
        }

        // Content-hashed bundles unter /assets/ aendern sich nie unter ihrem
        // Namen. index.html und /locales/ muessen dagegen revalidiert werden,
        // sonst zeigt eine gecachte index.html nach einem Deploy auf geloeschte
        // Asset-Hashes — dieselbe Begruendung wie in infra/staging/nginx.conf.
        const cacheControl = urlPath.startsWith('/assets/')
            ? 'public, max-age=2592000, immutable'
            : 'no-cache, must-revalidate';

        const headers = { 'Content-Type': contentType, 'Cache-Control': cacheControl };
        const accepts = String(req.headers['accept-encoding'] || '');

        // Bis 20.08. lieferte dieser Pfad alles unkomprimiert aus, waehrend der
        // nginx-Pfad daneben gzip nutzte — zwei Auslieferungswege sehr
        // unterschiedlicher Guete fuer dieselben Dateien.
        if (COMPRESSIBLE.has(extname) && /\bgzip\b/.test(accepts)) {
            zlib.gzip(content, (gzErr, zipped) => {
                if (gzErr) { res.writeHead(200, headers); res.end(content); return; }
                res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
                res.end(zipped);
            });
            return;
        }
        res.writeHead(200, headers);
        res.end(content);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Production UI Server running at http://0.0.0.0:${PORT}/`);
    console.log(`Serving static files from ${DIST_DIR}`);
});
