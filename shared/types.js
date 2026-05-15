/**
 * JSDoc typedefs for shared shapes (no TS build in /shared for now).
 * Step 2+ may introduce shared TypeScript or .d.ts files as needed.
 */

/** @typedef {{ user_id: string; name: string; inputs: Record<string, unknown>; created_at?: string }} ScenarioRow */
/** @typedef {{ user_id: string; provider: string; access_token: string; last_synced?: string | null }} SyncTokenRow */

export {};
