-- Step 4: documentation + API access for authenticated JWT users.
-- Plaintext Teller tokens must never be stored; encrypt in the app (or Edge Function) before INSERT.

comment on table public.scenarios is 'Named saved calculator scenarios; inputs is JSON matching client CalculatorInputs.';
comment on column public.scenarios.inputs is 'Opaque JSON blob of calculator state (sliders, bases, UI flags as needed).';

comment on table public.sync_tokens is 'Per-user OAuth / Teller credentials; RLS restricts to owner.';
comment on column public.sync_tokens.access_token is 'Application-layer ciphertext or vault reference only — not plaintext API tokens.';
comment on column public.sync_tokens.last_synced is 'Last successful balance sync from provider.';

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.scenarios to authenticated;
grant select, insert, update, delete on table public.sync_tokens to authenticated;
