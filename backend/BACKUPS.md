# Database backups

Every night at 02:30 India time, GitHub Actions saves the whole MongoDB database
(`.github/workflows/nightly-backup.yml`). The backup is encrypted with a passphrase
and kept for 30 days. The repository is public, so a backup is never stored unencrypted.

## One-time setup

GitHub → repository **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `MONGODB_URI` | the same value as `MONGODB_URI` on Render |
| `BACKUP_PASSPHRASE` | a long password (16+ characters). Keep it safe: without it a backup cannot be opened |

Then **Actions → Nightly database backup → Run workflow** once to check it works (green tick).

## Download and open a backup

1. GitHub → **Actions → Nightly database backup** → open a run → **Artifacts** → download
   `crm-backup-<date>`. Unzip it: you get `crm-backup-<date>.tar.gz.enc`.
2. Decrypt (OpenSSL; on Windows it comes with Git for Windows):

   ```
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in crm-backup-<date>.tar.gz.enc -out backup.tar.gz
   tar -xzf backup.tar.gz
   ```

   OpenSSL asks for the passphrase. You get a folder `db-backup/` with one JSON file per
   collection and `_meta.json` (date and record counts).

## Restore

Always run a dry run first; it only shows what would be written:

```
cd backend
MONGODB_URI=... node src/scripts/restore-nightly.js ../db-backup
MONGODB_URI=... node src/scripts/restore-nightly.js ../db-backup --apply
MONGODB_URI=... node src/scripts/restore-nightly.js ../db-backup --apply --only=leads,tasks
```

Records are upserted by id; nothing that is missing from the backup is deleted.
