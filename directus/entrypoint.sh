#!/bin/sh
set -e  # Exit on errors

LOCK_FILE="/directus/uploads/sync.lock"

# # Wait for Keycloak to become healthy
# until wget -q --spider "${AUTH_KEYCLOAK_ISSUER_URL}"; do
#     echo "Waiting for Keycloak to be ready at ${AUTH_KEYCLOAK_ISSUER_URL}..."
#     sleep 10
# done

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
    echo "No sync lock detected, syncing collections and fields"
    npx directus-sync push -u "http://localhost:8055" -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD"
fi

echo "Directus is running and synced."

# Keep the container running
wait
