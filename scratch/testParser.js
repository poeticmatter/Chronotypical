import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.resolve(__dirname, '../src/content');
try {
  const files = fs.readdirSync(contentDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));
  console.log(`Found ${mdxFiles.length} mdx files.`);
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
  console.log("Successfully parsed all files!");
  console.log(`Total parsed fragments: ${fragments.length}`);
} catch (e) {
  console.error("Parser failed:", e);
}
