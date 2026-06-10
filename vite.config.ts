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
        if (!req.url?.startsWith('/api/fragments')) {
          return next();
        }

        const contentDir = path.resolve(__dirname, 'src/content');

        // GET /api/fragments
        if (req.method === 'GET' && req.url === '/api/fragments') {
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

        // DELETE /api/fragments/:id
        if (req.method === 'DELETE' && req.url.startsWith('/api/fragments/')) {
          const id = req.url.split('/')[3];
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

        // POST /api/fragments/:id
        if (req.method === 'POST' && req.url.startsWith('/api/fragments/')) {
          const id = req.url.split('/')[3];
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
