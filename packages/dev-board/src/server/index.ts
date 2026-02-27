import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;
const WORKSPACE_ROOT = path.resolve(process.cwd(), '../..');
const TICKETS_DIR = path.join(WORKSPACE_ROOT, '.tickets');

async function ensureDirs() {
    const dirs = ['todo', 'doing', 'review', 'done', 'archive'];
    for (const dir of dirs) {
        await fs.mkdir(path.join(TICKETS_DIR, dir), { recursive: true }).catch(() => { });
    }
}

app.get('/api/tickets', async (req, res) => {
    try {
        const statuses = ['todo', 'doing', 'review', 'done'];
        const tickets = [];

        for (const status of statuses) {
            const dirPath = path.join(TICKETS_DIR, status);
            const files = await fs.readdir(dirPath).catch(() => []);

            for (const file of files) {
                if (!file.endsWith('.md')) continue;
                const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
                tickets.push({
                    id: file.replace('.md', ''),
                    status,
                    content
                });
            }
        }
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});

app.post('/api/tickets', async (req, res) => {
    const { title, description } = req.body;
    try {
        const ticketId = `TKT-${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
        const content = `---
title: "${title}"
assignee: "Task-Master"
status: "todo"
---

# ${title}

${description}
`;
        await fs.writeFile(path.join(TICKETS_DIR, 'todo', `${ticketId}.md`), content);
        res.json({ success: true, ticketId });
    } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});

const runningApps: Record<string, ChildProcess> = {};

app.post('/api/apps/start', (req, res) => {
    const { name, workspace } = req.body;
    if (!runningApps[name]) {
        const child = spawn('npm', ['run', 'dev', `--workspace=${workspace}`], { cwd: WORKSPACE_ROOT, stdio: 'ignore' });
        runningApps[name] = child;
    }
    res.json({ success: true });
});

app.post('/api/apps/stop', (req, res) => {
    const { name } = req.body;
    if (runningApps[name]) {
        runningApps[name].kill();
        delete runningApps[name];
    }
    res.json({ success: true });
});

app.post('/api/branch', async (req, res) => {
    const { ticketId } = req.body;
    try {
        const branchName = `feature/${ticketId}`;
        await execAsync(`git checkout -b ${branchName}`, { cwd: WORKSPACE_ROOT });
        res.json({ success: true, branch: branchName });
    } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});

app.post('/api/archive', async (req, res) => {
    const { ticketId } = req.body;
    try {
        const month = new Date().toISOString().slice(0, 7);
        const archiveDir = path.join(TICKETS_DIR, 'archive', month);
        await fs.mkdir(archiveDir, { recursive: true }).catch(() => { });

        const statuses = ['todo', 'doing', 'review', 'done'];
        let foundPath = '';
        for (const s of statuses) {
            const p = path.join(TICKETS_DIR, s, `${ticketId}.md`);
            if (await fs.stat(p).catch(() => false)) {
                foundPath = p;
                break;
            }
        }

        if (foundPath) {
            const dest = path.join(archiveDir, `${ticketId}.md`);
            await fs.rename(foundPath, dest);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});

app.listen(PORT, async () => {
    await ensureDirs();
    console.log(`🚀 Dev Board API running on http://localhost:${PORT}`);
});
