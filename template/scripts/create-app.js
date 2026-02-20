import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const TEMPLATE_DIR = path.join(REPO_ROOT, 'template/apps/example-app');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

function copyRecursiveSync(src, dest, tokenAppId, tokenAppName) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName), tokenAppId, tokenAppName);
        });
    } else {
        const content = fs.readFileSync(src, 'utf-8');
        const replaced = content
            .replace(/__APP_ID__/g, tokenAppId)
            .replace(/__APP_NAME__/g, tokenAppName);
        fs.writeFileSync(dest, replaced, 'utf-8');
    }
}

async function run() {
    console.log("--- CompliHub360 App Scaffolder ---\n");

    const appId = await question("App ID (kebab-case, e.g. my-new-app): ");
    if (!appId || !/^[a-z0-9-]+$/.test(appId)) {
        console.error("Invalid App ID. Must be kebab-case lowercase.");
        process.exit(1);
    }

    const appName = await question("App Name (e.g. My New App): ");
    if (!appName) {
        console.error("App Name is required.");
        process.exit(1);
    }

    rl.close();

    const targetDir = path.join(REPO_ROOT, 'apps', appId);

    if (fs.existsSync(targetDir)) {
        console.error(`\nError: Directory 'apps/${appId}' already exists.`);
        process.exit(1);
    }

    console.log(`\nScaffolding into: apps/${appId}...`);
    copyRecursiveSync(TEMPLATE_DIR, targetDir, appId, appName);

    // Update root package.json if not already wildcarded
    const rootPkgPath = path.join(REPO_ROOT, 'package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

    let workspacesUpdated = false;
    const workspacePath = `apps/${appId}/*`;

    if (!rootPkg.workspaces.includes(workspacePath) && !rootPkg.workspaces.includes('apps/*')) {
        rootPkg.workspaces.push(workspacePath);
        fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
        workspacesUpdated = true;
    }

    console.log("\n✅ App scaffolded successfully!");
    console.log("\nNext Steps:");
    if (workspacesUpdated) console.log("  1. Updated root package.json workspaces.");
    console.log("  2. Run `npm install`");
    console.log("  3. Run `npm run typecheck`");
    console.log("  4. Run `npm run build`\n");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
