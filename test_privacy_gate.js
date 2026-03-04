import { DefaultPolicyEngine } from './packages/policy-engine/src/index.ts';
import { redactText } from './services/redaction/src/index.ts';
import assert from 'assert';

console.log("Starting Deterministic Privacy & AI Gate Tests...");

// Simulated single tenant policy (e.g., unlimited for tests)
const store = new Map();
store.set("tenant1", {
    maxPayloadBytes: 1000000,
});

const policyEngine = new DefaultPolicyEngine(store);

function createAIContext(privacyFlags) {
    return {
        tenantId: "tenant1",
        appId: "app1",
        correlationId: "test-corr-id",
        requestId: "req-1",
        timestamp: new Date(),
        intent: "AI_PROCESSING",
        privacyFlags
    };
}

try {
    // Test 1: Redaction classification
    console.log("\n[Test 1] Redaction Classification");
    const highlyPIIText = "API KEY 1 is sk-abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz and API KEY 2 is sk-abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz";
    const redaction1 = redactText(highlyPIIText);
    console.log("DEBUG", redaction1.report);
    assert.strictEqual(redaction1.sanitized_ready, true, "Should be sanitized_ready");
    assert.strictEqual(redaction1.classification, 'restricted', "High risk PII should be restricted");
    console.log("✅ Redaction correctly classified high-risk payload as 'restricted'.");

    const safeText = "This is a public policy announcement for all employees.";
    const redaction2 = redactText(safeText);
    assert.strictEqual(redaction2.sanitized_ready, true, "Should be sanitized_ready");
    assert.strictEqual(redaction2.classification, 'public', "Safe text should be public");
    console.log("✅ Redaction correctly classified safe payload as 'public'.");

    // Test 2: AI Gate - Missing Flags
    console.log("\n[Test 2] AI Gate - Missing Privacy Flags");
    const decisionMissing = policyEngine.evaluate({
        tenantId: "tenant1",
        appId: "app1",
        correlationId: "test-corr-id",
        requestId: "req-1",
        timestamp: new Date(),
        intent: "AI_PROCESSING" // Missing privacyFlags entirely
    });
    assert.strictEqual(decisionMissing.allowed, false);
    assert.match(decisionMissing.reason, /Missing privacy context/);
    console.log("✅ AI Gate correctly blocked missing context.");

    // Test 3: AI Gate - German Rules (Strict Consent)
    console.log("\n[Test 3] AI Gate - German Strict Rules");
    const deNoConsentCtx = createAIContext({
        sanitized_ready: true,
        classification: 'internal',
        countryCode: 'DE',
        consent_allowAI: false
    });
    const decisionDEBlock = policyEngine.evaluate(deNoConsentCtx);
    assert.strictEqual(decisionDEBlock.allowed, false);
    assert.match(decisionDEBlock.reason, /Explicit consent required/);
    console.log("✅ AI Gate correctly blocked DE request lacking explicit consent.");

    const deWithConsentCtx = createAIContext({
        sanitized_ready: true,
        classification: 'internal',
        countryCode: 'DE',
        consent_allowAI: true
    });
    const decisionDEAllow = policyEngine.evaluate(deWithConsentCtx);
    assert.strictEqual(decisionDEAllow.allowed, true);
    console.log("✅ AI Gate correctly allowed DE request with explicit consent.");

    // Test 4: AI Gate - US Rules (Opt-out default)
    console.log("\n[Test 4] AI Gate - US Opt-out Rules");
    const usNoConsentCtx = createAIContext({
        sanitized_ready: true,
        classification: 'internal',
        countryCode: 'US',
        consent_allowAI: false // Consent not strictly required by matrix
    });
    const decisionUSAllow = policyEngine.evaluate(usNoConsentCtx);
    assert.strictEqual(decisionUSAllow.allowed, true);
    console.log("✅ AI Gate correctly allowed US request without prior explicit consent.");

    // Test 5: AI Gate - Restricted Classification Blocker
    console.log("\n[Test 5] AI Gate - Global Restricted Blocker");
    const restrictedCtx = createAIContext({
        sanitized_ready: true,
        classification: 'restricted',
        countryCode: 'US',
        consent_allowAI: true
    });
    const decisionRestricted = policyEngine.evaluate(restrictedCtx);
    assert.strictEqual(decisionRestricted.allowed, false);
    assert.match(decisionRestricted.reason, /classification is restricted/);
    console.log("✅ AI Gate correctly globally blocked 'restricted' data despite consent.");

    // Test 6: AI Gate - Unsanitized Blocker
    console.log("\n[Test 6] AI Gate - Unsanitized Blocker");
    const unsanitizedCtx = createAIContext({
        sanitized_ready: false,
        classification: 'public',
        countryCode: 'US',
        consent_allowAI: true
    });
    const decisionUnsanitized = policyEngine.evaluate(unsanitizedCtx);
    assert.strictEqual(decisionUnsanitized.allowed, false);
    assert.match(decisionUnsanitized.reason, /not sanitized/);
    console.log("✅ AI Gate correctly globally blocked unsanitized data.");

    console.log("\n🎉 All Privacy Architecture & AI Gate deterministic tests passed!");

} catch (err) {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
}
