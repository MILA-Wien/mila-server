#!/bin/sh
set -e  # Exit on errors

LOCK_FILE="/directus/uploads/first-run.lock"

# Start Directus in the background
cd /directus
node cli.js bootstrap && pm2-runtime start ecosystem.config.cjs &

# Wait for Directus to be available using wget
until wget -q --spider "http://127.0.0.1:8055/server/health"; do
    echo "Waiting for Directus to start..."
    sleep 10
done

# Run the sync process only on first run
if [ ! -f "$LOCK_FILE" ]; then
    echo "First run detected, syncing collections and fields"
    echo "Admin Email: $ADMIN_EMAIL"
    echo "Admin Password: $ADMIN_PASSWORD"
    npx directus-sync push -u "http://localhost:8055" -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD"
    touch "$LOCK_FILE"
fi

# Keep the container running
wait
