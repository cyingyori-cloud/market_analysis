# Repair Scripts

This directory contains one-off or low-frequency repair scripts that are not part
of the primary production data flow.

Use these scripts only for controlled data backfills, URL repair, or migration
support during the refactor.

Rules:

- Do not treat these scripts as the canonical ingestion pipeline.
- Prefer API, worker, and database migrations for new work.
- Keep paths relative to the repository root so the scripts remain movable.
