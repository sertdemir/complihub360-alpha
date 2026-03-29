import type { AgentRegistry } from "@complihub/agent-registry";
import type { Orchestrator } from "@complihub/task-orchestrator";
import type { Plugin, PluginRegistration } from "./types.js";

export class PluginManager {
    private registrations: PluginRegistration[] = [];

    constructor(
        private registry: AgentRegistry,
        private orchestrator: Orchestrator
    ) {}

    public async load(plugin: Plugin): Promise<void> {
        if (this.registrations.some(r => r.plugin.meta.name === plugin.meta.name)) {
            throw new Error(`Plugin '${plugin.meta.name}' is already loaded.`);
        }

        if (plugin.initialize) {
            await plugin.initialize();
        }

        if (plugin.agents) {
            for (const agent of plugin.agents) {
                this.registry.register(agent);
            }
        }

        if (plugin.executables) {
            for (const exec of plugin.executables) {
                this.orchestrator.registerExecutable(exec);
            }
        }

        if (plugin.middlewares) {
            for (const mw of plugin.middlewares) {
                this.orchestrator.use(mw);
            }
        }

        if (plugin.observers) {
            for (const obs of plugin.observers) {
                this.orchestrator.addObserver(obs);
            }
        }

        this.registrations.push({
            plugin,
            registeredAt: new Date()
        });
    }

    public async loadAll(plugins: Plugin[]): Promise<void> {
        for (const plugin of plugins) {
            await this.load(plugin);
        }
    }

    public getLoaded(): PluginRegistration[] {
        return [...this.registrations];
    }

    public isLoaded(name: string): boolean {
        return this.registrations.some(r => r.plugin.meta.name === name);
    }

    public async destroyAll(): Promise<void> {
        for (const reg of this.registrations) {
            if (reg.plugin.destroy) {
                await reg.plugin.destroy();
            }
        }
        this.registrations = [];
    }
}
