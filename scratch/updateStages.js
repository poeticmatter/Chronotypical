import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.resolve(__dirname, '../src/content');
const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.mdx'));

console.log("Planned stage updates:");
let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(contentDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const stage = data.stage || '';
  const tags = data.tags || [];

  if (stage === 'parenting-young') {
    let newStage = 'one-kid';
    if (tags.includes('poly')) {
      newStage = 'poly';
    } else if (
      tags.some(t => t.toLowerCase() === 'iris') ||
      content.toLowerCase().includes('iris')
    ) {
      newStage = 'two-kids';
    }

    console.log(`- File: ${file} (ID: ${data.id}) : parenting-young -> ${newStage}`);
    
    // Update frontmatter data
    data.stage = newStage;
    
    // Stringify back
    const newContent = matter.stringify(content, data);
    
    // Write back to file
    fs.writeFileSync(filePath, newContent, 'utf8');
    updatedCount++;
  }
}

console.log(`\nSuccessfully updated stage in ${updatedCount} files.`);
