/**
 * Row shapes for PostgreSQL tables managed by the Express API (`server/`).
 */
export type ScenarioRow = {
  id: string
  user_id: string
  name: string
  inputs: Record<string, unknown>
  created_at: string
}
