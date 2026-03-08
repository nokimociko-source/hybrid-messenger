import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, 'src');
const loggerPath = path.resolve(__dirname, 'src/app/utils/logger.ts');

function getRelativePathToLogger(filePath) {
    const relative = path.relative(path.dirname(filePath), loggerPath);
    let posixPath = relative.split(path.sep).join('/');
    if (posixPath.endsWith('.ts')) {
        posixPath = posixPath.slice(0, -3);
    }
    if (!posixPath.startsWith('.')) {
        posixPath = './' + posixPath;
    }
    return posixPath;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === 'dist') continue;
            processDirectory(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            if (fullPath === loggerPath || fullPath.includes('.test.') || fullPath.includes('.spec.')) continue;

            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            const checks = [
                { reg: /\bconsole\.log\(/g, rep: 'logger.info(' },
                { reg: /\bconsole\.warn\(/g, rep: 'logger.warn(' },
                { reg: /\bconsole\.error\(/g, rep: 'logger.error(' },
                { reg: /\bconsole\.info\(/g, rep: 'logger.info(' },
                { reg: /\bconsole\.debug\(/g, rep: 'logger.debug(' }
            ];

            for (const { reg, rep } of checks) {
                if (reg.test(content)) {
                    content = content.replace(reg, rep);
                    modified = true;
                }
            }

            if (modified) {
                const importRegex = /import\s+.*logger.*\s+from\s+['"].*logger['"]/;
                if (!importRegex.test(content)) {
                    const relativePath = getRelativePathToLogger(fullPath);
                    const importStatement = `import { logger } from '${relativePath}';\n`;
                    content = importStatement + content;
                }

                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Processed: ${fullPath}`);
            }
        }
    }
}

processDirectory(srcDir);
console.log('Done.');
