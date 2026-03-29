import type { AgentId } from "@complihub/agent-core";
import type { TaskContext, ExecutionResult, Middleware, MiddlewareNext } from "./types.js";

export function composeMiddlewares(middlewares: Middleware[]): Middleware {
    return async function (context: TaskContext, next: MiddlewareNext, agentId: AgentId): Promise<ExecutionResult> {
        let index = -1;

        async function dispatch(i: number): Promise<ExecutionResult> {
            if (i <= index) {
                return Promise.reject(new Error("next() called multiple times in middleware chain"));
            }
            index = i;
            const middleware = middlewares[i];

            if (i === middlewares.length) {
                return await next();
            }

            return await middleware(context, () => dispatch(i + 1), agentId);
        }

        return dispatch(0);
    };
}

export const loggerMiddleware: Middleware = async (ctx, next, agentId) => {
    const start = Date.now();
    // Simulate logging explicitly outside standard execution path without true console usage
    const result = await next();
    // Re-verify duration injection if necessary, generally handled by core execute wrapper 
    return result;
};

export const errorBoundaryMiddleware: Middleware = async (ctx, next, agentId) => {
    try {
        return await next();
    } catch (e) {
        // Fallback for uncaught exceptions leaking outside the main execution block
        const err = e instanceof Error ? e : new Error(String(e));
        return {
            ok: false,
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack,
                code: "UNHANDLED_EXCEPTION"
            },
            durationMs: 0, // Fallback, orchestrator sets real duration
            agentId: agentId
        };
    }
};
