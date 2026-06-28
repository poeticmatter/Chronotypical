import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.resolve(__dirname, '../src/content');
const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.mdx'));

console.log("ALL FRAGMENTS IN parenting-young:");
for (const file of files) {
  const filePath = path.join(contentDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const id = data.id || file.replace('.mdx', '');
  const stage = data.stage || '';
  const tags = data.tags || [];
  const chronological_order = data.chronological_order || 0;

  if (stage === 'parenting-young') {
    const hasIrisInContent = content.toLowerCase().includes('iris');
    console.log(`- File: ${file}, ID: ${id}, Title: "${data.title}", Tags: [${tags.join(', ')}], Order: ${chronological_order}, HasIris: ${hasIrisInContent}`);
  }
}

console.log("\nALL FRAGMENTS WITH iris OUTSIDE parenting-young:");
for (const file of files) {
  const filePath = path.join(contentDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const id = data.id || file.replace('.mdx', '');
  const stage = data.stage || '';
  const tags = data.tags || [];
  const chronological_order = data.chronological_order || 0;

  if (stage !== 'parenting-young' && content.toLowerCase().includes('iris')) {
    console.log(`- File: ${file}, ID: ${id}, Stage: "${stage}", Title: "${data.title}", Tags: [${tags.join(', ')}], Order: ${chronological_order}`);
  }
}
