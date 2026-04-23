# Import Scripts

These scripts bridge the current file-based snapshot and the future PostgreSQL
single-source database.

Current workflow:

1. Read the repository `db.json`
2. Generate SQL inserts for PostgreSQL
3. Apply the generated SQL with your preferred PostgreSQL client

This directory intentionally avoids extra npm dependencies so it can be used
immediately during the refactor.
