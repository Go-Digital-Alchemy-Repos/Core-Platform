-- One ALTER statement atomically replaces the constraint, including on replay.
ALTER TABLE woo_import_runs
  DROP CONSTRAINT woo_import_runs_contract_version_check,
  ADD CONSTRAINT woo_import_runs_contract_version_check
    CHECK (contract_version IN ('1.0.0', '1.1.0'));
