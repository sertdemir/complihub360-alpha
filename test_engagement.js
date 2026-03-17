import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3009;

// Start the server directly bypassing local npm failing cache
const serverProcess = spawn('npx', ['-y', '--cache', '/tmp/npm-cache', 'tsx', 'services/compliance-api/src/index.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    cwd: __dirname
});

serverProcess.stdout.on('data', data => console.log(`[API]: ${data}`));
serverProcess.stderr.on('data', data => console.error(`[API ERROR]: ${data}`));

setTimeout(async () => {
    try {
        console.log("Testing Engagement Endpoint...");
        const res1 = await fetch(`http://127.0.0.1:${PORT}/api/v1/engagement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: 'user123',
                provider_key: 'prov_test',
                country: 'DE',
                category: 'Tax',
                message: 'Need help with tax'
            })
        });

        const data1 = await res1.json();
        if (res1.status !== 201) throw new Error(`Status ${res1.status}: ${JSON.stringify(data1)}`);
        if (!data1.id.startsWith('eng_')) throw new Error("ID not generated correctly.");
        console.log(`✅ Created Engagement: ${data1.id}`);
        const engId = data1.id;

        console.log("\nTesting Magic Link Verification...");
        const res2 = await fetch(`http://127.0.0.1:${PORT}/api/v1/provider/magic/verify_token`);
        const data2 = await res2.json();
        if (res2.status !== 200) throw new Error(`Status ${res2.status}`);
        if (data2.token !== "verify_token") throw new Error("Magic link not verified.");
        console.log(`✅ Verified Magic Link`);

        console.log("\nTesting Provider Confirm...");
        const res3 = await fetch(`http://127.0.0.1:${PORT}/api/v1/provider/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engagementId: engId })
        });
        const data3 = await res3.json();
        if (res3.status !== 200) throw new Error(`Status ${res3.status}`);
        console.log(`✅ Verified Provider Confirmation`);

        console.log("\nTesting Provider Reply...");
        const res4 = await fetch(`http://127.0.0.1:${PORT}/api/v1/provider/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engagementId: engId })
        });
        const data4 = await res4.json();
        if (res4.status !== 200) throw new Error(`Status ${res4.status}`);
        console.log(`✅ Verified Provider Reply`);

        console.log("\n🎉 All tests passed!");
    } catch (e) {
        console.error("❌ Test failed:", e.message);
        process.exitCode = 1;
    } finally {
        serverProcess.kill();
        process.exit();
    }
}, 5000);
