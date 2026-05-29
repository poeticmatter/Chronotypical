import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.resolve(__dirname, '../src/content');
const manifestPath = path.resolve(__dirname, '../src/manifest.json');

function buildManifest() {
  const files = fs.readdirSync(contentDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));

  const manifest = [];

  for (const file of mdxFiles) {
    const filePath = path.join(contentDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContent);

    // Validate and extract frontmatter
    const id = data.id || file.replace('.mdx', '');
    const chronological_order = data.chronological_order || 0;
    const requires = data.requires || [];
    const required_pool_count = data.required_pool_count || 0;
    const tags = data.tags || [];
    const warnings = data.warnings || [];

    manifest.push({
      id,
      chronological_order,
      requires,
      required_pool_count,
      tags,
      warnings
    });
  }

  // Sort by chronological order just to have a predictable default state
  manifest.sort((a, b) => a.chronological_order - b.chronological_order);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest built successfully with ${manifest.length} fragments.`);
}

buildManifest();
