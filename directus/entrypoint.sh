#!/bin/sh
set -e  # Exit on errors

LOCK_FILE="/directus/uploads/sync.lock"
DIRECTUS_HEALTH_URL="http://127.0.0.1:8055/server/health"
CHECK_INTERVAL="${CHECK_INTERVAL:-10}"
DIRECTUS_STARTUP_TIMEOUT="${DIRECTUS_STARTUP_TIMEOUT:-300}"
KEYCLOAK_STARTUP_TIMEOUT="${KEYCLOAK_STARTUP_TIMEOUT:-180}"

cd /directus

# Wait for Keycloak to be reachable before bootstrapping, since
# "node cli.js bootstrap" validates/registers the Keycloak OIDC provider
# and can fail if Keycloak isn't up yet. KEYCLOAK_URL is unset in
# environments without a Keycloak service (e.g. local dev), so the wait
# is skipped there.
if [ -n "$KEYCLOAK_URL" ]; then
    elapsed=0
    until wget -q --spider "${KEYCLOAK_URL}/health/ready"; do
        if [ "$elapsed" -ge "$KEYCLOAK_STARTUP_TIMEOUT" ]; then
            echo "WARNING: Keycloak was not ready at ${KEYCLOAK_URL}/health/ready after ${KEYCLOAK_STARTUP_TIMEOUT}s. Proceeding with bootstrap anyway." >&2
            break
        fi
        echo "Waiting for Keycloak to be ready at ${KEYCLOAK_URL} (${elapsed}s/${KEYCLOAK_STARTUP_TIMEOUT}s)..."
        sleep "$CHECK_INTERVAL"
        elapsed=$((elapsed + CHECK_INTERVAL))
    done
else
    echo "KEYCLOAK_URL is not set, skipping Keycloak readiness check."
fi

# Start Directus in the background. The subshell's PID is tracked so that
# if bootstrap or pm2-runtime dies (e.g. Keycloak still unreachable), the
# health-check loop below can detect it.
(
    node cli.js bootstrap && exec pm2-runtime start ecosystem.config.cjs
) &
DIRECTUS_PID=$!

# Wait for Directus to be available using wget
elapsed=0
until wget -q --spider "$DIRECTUS_HEALTH_URL"; do
    if ! kill -0 "$DIRECTUS_PID" 2>/dev/null; then
        echo "ERROR: Directus startup process exited unexpectedly before becoming healthy (bootstrap or pm2-runtime crashed). Check the logs above for the underlying error." >&2
        exit 1
    fi
    if [ "$elapsed" -ge "$DIRECTUS_STARTUP_TIMEOUT" ]; then
        echo "ERROR: Directus did not become healthy within ${DIRECTUS_STARTUP_TIMEOUT}s." >&2
        exit 1
    fi
    echo "Waiting for Directus to start... (${elapsed}s/${DIRECTUS_STARTUP_TIMEOUT}s)"
    sleep "$CHECK_INTERVAL"
    elapsed=$((elapsed + CHECK_INTERVAL))
done

# Run the sync process if there is no lock file
if [ ! -f "$LOCK_FILE" ]; then
    echo "No sync lock detected, syncing collections and fields"
    npx directus-sync push -u "http://localhost:8055" -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD"
fi

echo "Directus is running and synced."

# Keep the container running
wait "$DIRECTUS_PID"
