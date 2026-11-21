import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

// The checkout is reclaimed after the run. Keep the self-contained game
// available for the full lifetime of its supervised preview.
const game = await readFile(process.argv[2]);
createServer((request, response) => {
  if (request.url.split('?')[0] !== '/' || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': game.length,
    'Cache-Control': 'no-store',
  });
  response.end(request.method === 'HEAD' ? undefined : game);
}).listen(Number(process.env.MULTICA_PORT), '127.0.0.1');
