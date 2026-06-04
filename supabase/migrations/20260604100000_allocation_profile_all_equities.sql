-- Allow all-equity allocation profile (slider stop 3).
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_allocation_profile_check;

ALTER TABLE accounts ADD CONSTRAINT accounts_allocation_profile_check CHECK (
  allocation_profile IS NULL
  OR allocation_profile IN ('aggressive', 'moderate', 'conservative', 'all_equities')
);
