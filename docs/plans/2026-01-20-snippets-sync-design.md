# iSnippets Snippets Sync Design

## Goal
Unify local data model and sync protocol for iSnippets using a single remote snapshot file
`iSnippets/snippets.json` with deterministic merge semantics based on `id` and `updated_at`.

## Data Model
Local IndexedDB adds a new `snippets` store (keyPath `id`). Each record uses the new schema:

Required:
- `id` (UUID)
- `type` (`web` | `note`)
- `text` (<= 144)
- `created_at` (ms)
- `updated_at` (ms)
- `deleted_at` (ms | null)
- `purged_at` (ms | null)

Optional:
- `url` (string | null)
- `domain` (string | null)

UI filters:
- Normal list: `deleted_at == null && purged_at == null`
- Trash: `deleted_at != null && purged_at == null`
- Tombstone: `purged_at != null` (never displayed, sync only)

## Migration
On startup, perform a one-time migration from `indexCards` to `snippets` and mark completion in
settings (e.g. `snippets_migrated = true`). Mapping rules:
- `text`: prefer `clipText`, fall back to `title`, or empty string
- `type`: `web` if `url` exists, otherwise `note`
- `url`, `domain`: copy if present
- `created_at`: from `createdAt`
- `updated_at`: from `updatedAt` or `createdAt`
- `deleted_at`, `purged_at`: default `null`

After migration, all reads/writes use `snippets`; `indexCards` remains but is no longer used.

## Sync Protocol
Remote stores a single snapshot file: `iSnippets/snippets.json` (Drive/WebDAV).
Sync button runs: Pull -> Merge -> Push.

Merge rules:
- Primary key: `id`
- If both exist, keep the record with larger `updated_at`
- If equal `updated_at`, prefer remote
- If only one side exists, keep it
- Merge writes back full upsert to local `snippets` (no deletions on missing remote)

Deletion rules:
- Soft delete: `deleted_at = now; purged_at = null; updated_at = now`
- Restore: `deleted_at = null; purged_at = null; updated_at = now`
- Purge: `deleted_at = deleted_at ?? now; purged_at = now; updated_at = now`

Tombstone cleanup:
- Locally delete records with `purged_at != null` older than 30 days
- Only after at least one successful sync (presence of `last_remote_etag`)

## Remote Version Marker
Store `last_remote_etag` in `syncConfig`.
- WebDAV: HTTP ETag
- Google Drive: `headRevisionId` (preferred) or `modifiedTime`

If remote marker changes before upload, re-run Pull -> Merge -> Push to avoid overwrite.

## Error Handling
- Pull: 404 => treat as empty; other failures abort with error
- Parse failure => abort and surface error
- Push failure => abort, keep local data

## Testing Focus
- Migration correctness and idempotency
- Merge precedence by `updated_at`
- Deletion/restore/purge state transitions
- Tombstone cleanup guard and age threshold
- Sync flow including remote marker change
