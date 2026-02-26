import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;
const WORKSPACE_ROOT = path.resolve(process.cwd(), '../..');
const TICKETS_DIR = path.join(WORKSPACE_ROOT, '.tickets');

// Helper to ensure directories exist
async function ensureDirs() {
    const dirs = ['todo', 'doing', 'review', 'done', 'archive'];
    for (const dir of dirs) {
        await fs.mkdir(path.join(TICKETS_DIR, dir), { recursive: true });
    }
}

// API: Get all tickets
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

// Start Server
app.listen(PORT, async () => {
    await ensureDirs();
    console.log(`🚀 Dev Board API running on http://localhost:${PORT}`);
});
