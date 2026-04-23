# Database

This directory contains the PostgreSQL foundation for the refactor.

Files:

- `schema.sql`: canonical relational schema for the Phase 1 single-source database
- `seeds/`: generated or curated seed SQL files

Recommended workflow:

1. Apply `schema.sql` to a PostgreSQL database.
2. Generate import SQL from the current `db.json`.
3. Load the generated SQL into the database.

The current import path is file-based on purpose so we do not need extra runtime
dependencies while the backend is still being migrated.
