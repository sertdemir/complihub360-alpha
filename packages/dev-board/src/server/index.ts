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
    const dirs = ['todo', 'doing', 'waiting', 'review', 'done', 'archive'];
    for (const dir of dirs) {
        await fs.mkdir(path.join(TICKETS_DIR, dir), { recursive: true }).catch(() => { });
    }
}

app.get('/api/tickets', async (_req, res) => {
    try {
        const statuses = ['todo', 'doing', 'waiting', 'review', 'done'];
        const tickets = [];

        for (const status of statuses) {
            const dirPath = path.join(TICKETS_DIR, status);
            const files = await fs.readdir(dirPath).catch(() => []);

            for (const file of files) {
                if (!file.endsWith('.md')) continue;
                const content = await fs.readFile(path.join(dirPath, file), 'utf-8');

                // Parse basic frontmatter (epic and title)
                const epicMatch = content.match(/^epic:\s*"?([^"\n]+)"?/m);
                const epic = epicMatch ? epicMatch[1] : null;
                const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
                const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
                const assigneeMatch = content.match(/^assignee:\s*"?([^"\n]+)"?/m);
                const assignee = assigneeMatch ? assigneeMatch[1] : null;

                // Parse Agent Audit Log list items
                let auditLog = [];
                const auditLogIndex = content.indexOf('## Agent Audit Log');
                if (auditLogIndex !== -1) {
                    const logSection = content.substring(auditLogIndex);
                    const listMatches = logSection.matchAll(/-\s+\[(.*?)\]\s+\*\*([^*]+)\*\*:\s+(.*?)$/gm);
                    for (const match of listMatches) {
                        auditLog.push({ timestamp: match[1], agent: match[2], action: match[3] });
                    }
                }

                tickets.push({
                    id: file.replace('.md', ''),
                    status,
                    epic,
                    title,
                    assignee,
                    content,
                    auditLog
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
    const { name, appPath, port } = req.body;
    if (!runningApps[name]) {
        const vitePath = path.join(WORKSPACE_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
        const targetCwd = path.join(WORKSPACE_ROOT, appPath);

        const child = spawn('node', [vitePath, '--port', String(port), '--strictPort'], {
            cwd: targetCwd,
            stdio: 'ignore'
        });
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

        const statuses = ['todo', 'doing', 'waiting', 'review', 'done'];
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
