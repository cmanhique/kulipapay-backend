#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/Projects/KulipaPay/backups
mkdir -p "$BACKUP_DIR"
/usr/local/opt/postgresql@14/bin/pg_dump kulipapay_prod > "$BACKUP_DIR/kulipapay_$DATE.sql"
echo "✅ Backup criado: $BACKUP_DIR/kulipapay_$DATE.sql"
