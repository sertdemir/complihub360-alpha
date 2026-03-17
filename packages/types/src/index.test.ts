import * as assert from "node:assert";
import { createTaskContext, createPolicyContext } from "./context.js";
import { DEFAULT_APP_ID } from "./app.js";

function runTests() {
    const taskCtx = createTaskContext();
    assert.strictEqual(taskCtx.appId, DEFAULT_APP_ID);
    assert.ok(taskCtx.tenantId);
    assert.ok(taskCtx.correlationId.startsWith("corr-"));
    assert.ok(taskCtx.requestId.startsWith("req-"));
    assert.ok(taskCtx.timestamp instanceof Date);

    const overrideCtx = createTaskContext({ appId: "custom-app", tenantId: "custom" });
    assert.strictEqual(overrideCtx.appId, "custom-app");
    assert.strictEqual(overrideCtx.tenantId, "custom");
    assert.ok(overrideCtx.correlationId);

    const polCtx = createPolicyContext(taskCtx, { agentId: "test-agent" });
    assert.strictEqual(polCtx.appId, taskCtx.appId);
    assert.strictEqual(polCtx.correlationId, taskCtx.correlationId);
    assert.strictEqual(polCtx.agentId, "test-agent");

    console.log("✅ Types/Context tests passed!");
}

runTests();
