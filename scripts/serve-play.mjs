import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

// The checkout is reclaimed after the run. Keep the self-contained game
// available for the full lifetime of its supervised preview.
const pages = new Map([['/', await readFile(process.argv[2])]]);
if (process.argv[3]) pages.set('/AI-Museum.html', await readFile(process.argv[3]));
createServer((request, response) => {
  const page = pages.get(request.url.split('?')[0]);
  if (!page || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': page.length,
    'Cache-Control': 'no-store',
  });
  response.end(request.method === 'HEAD' ? undefined : page);
}).listen(Number(process.env.MULTICA_PORT), '127.0.0.1');
