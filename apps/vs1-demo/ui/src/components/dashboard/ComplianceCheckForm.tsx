import { useState } from "react";
import { BaseButton } from "../primitives/BaseButton";
import type { ComplianceCheckRequest, ComplianceCheckResponse, ComplianceCheckFinding } from "@complihub360/types";

export function ComplianceCheckForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ComplianceCheckResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [tenantId, setTenantId] = useState("default-tenant");
    const [appId, setAppId] = useState("vs1-demo");
    const [text, setText] = useState("");
    const [tags, setTags] = useState("");

    const handleRunCheck = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        const requestData: ComplianceCheckRequest = {
            tenantId,
            appId,
            text,
            tags: tags.split(",").map(t => t.trim()).filter(Boolean)
        };

        try {
            const res = await fetch("http://localhost:3001/api/compliance/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error ${res.status}`);
            }

            const data = await res.json() as ComplianceCheckResponse;
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white/90">Run Compliance Check (VS1)</h2>
            <div className="flex flex-col gap-4 p-4 border border-white/10 rounded-lg bg-white/5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-white/60">Tenant ID</label>
                        <input
                            type="text"
                            className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                            value={tenantId}
                            onChange={(e) => setTenantId(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-white/60">App ID</label>
                        <input
                            type="text"
                            className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                            value={appId}
                            onChange={(e) => setAppId(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-white/60">Text Payload to Analyze</label>
                    <textarea
                        className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 min-h-[100px]"
                        placeholder="Enter text here... (try typing 'password' or a short sentence under 20 chars)"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-white/60">Tags (comma-separated)</label>
                    <input
                        type="text"
                        className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                        placeholder="e.g. public, internal, draft"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </div>

                <div className="pt-2">
                    <BaseButton variant="primary" onClick={handleRunCheck} disabled={isLoading || !text}>
                        {isLoading ? "Running..." : "Run Check"}
                    </BaseButton>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm mt-4">
                        <b>Error:</b> {error}
                    </div>
                )}

                {result && (
                    <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
                        <h3 className="text-lg font-semibold text-white/90">Results</h3>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-white/50">Decision</span>
                                <span className={`font-semibold ${result.decision === 'allowed' ? 'text-green-500' : 'text-red-500'}`}>
                                    {result.decision.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-white/50">Correlation ID</span>
                                <span className="font-mono text-xs">{result.correlationId}</span>
                            </div>
                        </div>

                        {result.reason && (
                            <div className="text-sm bg-white/5 p-3 rounded text-white/80">
                                <strong>Reason: </strong> {result.reason}
                            </div>
                        )}

                        <div className="space-y-2 mt-4">
                            <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider">Findings ({result.findings.length})</h4>
                            {result.findings.length === 0 ? (
                                <p className="text-sm text-white/40 italic">No findings reported.</p>
                            ) : (
                                <div className="space-y-2">
                                    {result.findings.map((f: ComplianceCheckFinding, idx: number) => (
                                        <div key={idx} className="p-3 border border-white/10 bg-white/5 rounded text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-white/90">{f.title}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${f.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                                                        f.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {f.severity}
                                                </span>
                                            </div>
                                            {f.description && <p className="text-white/70">{f.description}</p>}
                                            {f.suggestion && <p className="text-white/50 mt-1"><em>Suggestion: {f.suggestion}</em></p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
