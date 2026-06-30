import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.resolve(__dirname, '../src/content');
const outputPath = path.resolve(__dirname, '../chronological_story.md');

function compile() {
  if (!fs.existsSync(contentDir)) {
    console.error(`Error: Content directory not found at ${contentDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(contentDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));

  if (mdxFiles.length === 0) {
    console.warn(`No MDX files found in ${contentDir}`);
    return;
  }

  const fragments = [];

  for (const file of mdxFiles) {
    const filePath = path.join(contentDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    fragments.push({
      id: data.id || file.replace('.mdx', ''),
      title: data.title || '',
      chronological_order: data.chronological_order !== undefined ? data.chronological_order : 9999,
      content: content.trim()
    });
  }

  // Sort by chronological_order ascending
  fragments.sort((a, b) => a.chronological_order - b.chronological_order);

  // Combine into a single markdown structure
  const compiledContent = fragments
    .map(frag => {
      // Header for each fragment, then the body content
      return `## ${frag.title}\n\n${frag.content}`;
    })
    .join('\n\n---\n\n');

  fs.writeFileSync(outputPath, compiledContent, 'utf8');
  console.log(`Successfully compiled ${fragments.length} fragments chronologically into:\n${outputPath}`);
}

compile();
