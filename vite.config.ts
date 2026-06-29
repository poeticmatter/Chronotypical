import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

function localEditorPlugin(): Plugin {
  return {
    name: 'local-mdx-editor',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '';
        if (!urlPath.startsWith('/api/fragments')) {
          return next();
        }

        const contentDir = path.resolve(__dirname, 'src/content');

        // GET /api/fragments
        if (req.method === 'GET' && urlPath === '/api/fragments') {
          try {
            const files = fs.readdirSync(contentDir);
            const mdxFiles = files.filter(f => f.endsWith('.mdx'));
            const fragments = mdxFiles.map(file => {
              const filePath = path.join(contentDir, file);
              const fileContent = fs.readFileSync(filePath, 'utf8');
              const { data, content } = matter(fileContent);
              return {
                id: data.id || file.replace('.mdx', ''),
                metadata: {
                  id: data.id || file.replace('.mdx', ''),
                  title: data.title || '',
                  chronological_order: data.chronological_order || 0,
                  requires: data.requires || [],
                  required_pool_count: data.required_pool_count || 0,
                  tags: data.tags || [],
                  warnings: data.warnings || [],
                  stage: data.stage || '',
                  reviewed: data.reviewed || false,
                },
                content: content.trim()
              };
            });
          res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(fragments));
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read fragments' }));
          }
          return;
        }

        // GET /api/fragments/:id/history
        // GET /api/fragments/:id/history/:hash
        if (req.method === 'GET' && urlPath.startsWith('/api/fragments/') && urlPath.includes('/history')) {
          const parts = urlPath.split('/');
          const id = decodeURIComponent(parts[3] || '');
          const hash = parts[5] ? decodeURIComponent(parts[5]) : undefined;

          if (!id) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing ID' }));
          }

          const filePath = path.join(contentDir, `${id}.mdx`);
          if (!fs.existsSync(filePath)) {
            console.warn(`[local-editor] Fragment file not found: ${filePath} (id: ${id})`);
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: `Fragment file not found: ${id}` }));
          }

          import('child_process').then(cp => {
            const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

            if (hash) {
              cp.exec(`git show ${hash}:"${relativePath}"`, (err, stdout) => {
                if (err) {
                  console.error(err);
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: `Failed to show file content at ${hash}` }));
                }
                try {
                  const { content } = matter(stdout);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ hash, content: content.trim() }));
                } catch (e) {
                  console.error(e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Failed to parse file content' }));
                }
              });
            } else {
              cp.exec(`git log --follow --format="%H|%an|%ad|%s" -- "${relativePath}"`, (err, stdout) => {
                if (err) {
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify([]));
                }
                const commits = stdout.trim().split('\n').filter(Boolean).map(line => {
                  const [commitHash, author, date, subject] = line.split('|');
                  return { hash: commitHash, author, date, subject };
                });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(commits));
              });
            }
          });
          return;
        }

        // DELETE /api/fragments/:id
        if (req.method === 'DELETE' && urlPath.startsWith('/api/fragments/')) {
          const id = urlPath.split('/')[3];
          if (!id) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing ID' }));
          }
          const filePath = path.join(contentDir, `${id}.mdx`);
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'Fragment not found' }));
          }
          fs.unlinkSync(filePath);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // POST /api/fragments/batch-update
        if (req.method === 'POST' && urlPath === '/api/fragments/batch-update') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { updates } = JSON.parse(body);
              if (!Array.isArray(updates)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Updates must be an array' }));
              }

              for (const update of updates) {
                const { id, metadata, content } = update;
                const filePath = path.join(contentDir, `${id}.mdx`);
                const fileContent = matter.stringify(content, metadata);
                fs.writeFileSync(filePath, fileContent);
              }

              // Run manifest parser once
              const buildManifestPath = path.resolve(__dirname, 'scripts/manifestParser.js');
              import('child_process').then(cp => {
                 cp.exec(`node ${buildManifestPath}`, (err) => {
                     if(err) console.error("Error building manifest after batch save", err);
                 });
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to batch save fragments' }));
            }
          });
          return;
        }

        // POST /api/fragments/:id
        if (req.method === 'POST' && urlPath.startsWith('/api/fragments/')) {
          const id = urlPath.split('/')[3];
          if (!id) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing ID' }));
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { metadata, content } = JSON.parse(body);
              const filePath = path.join(contentDir, `${id}.mdx`);
              const fileContent = matter.stringify(content, metadata);

              if (!fs.existsSync(contentDir)) {
                 fs.mkdirSync(contentDir, { recursive: true });
              }
              fs.writeFileSync(filePath, fileContent);

              // Let's also re-run the manifest builder
              const buildManifestPath = path.resolve(__dirname, 'scripts/manifestParser.js');
              import('child_process').then(cp => {
                 cp.exec(`node ${buildManifestPath}`, (err) => {
                     if(err) console.error("Error building manifest after save", err);
                 });
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              console.error(e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save fragment' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    localEditorPlugin(),
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter],
        providerImportSource: "@mdx-js/react"
      })
    },
    react(),
    tailwindcss()
  ],
})
