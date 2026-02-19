#!/usr/bin/env node
/**
 * heal-poller.mjs
 * Runs locally alongside the dev server to call the self-healing endpoint every 5 minutes.
 * Started automatically by dev:auto (scripts/dev.sh)
 */

const PORT = process.env.PORT || 3210
const INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const ENDPOINT = `http://localhost:${PORT}/api/cron/heal-sandboxes`

async function heal() {
  try {
    const res = await fetch(ENDPOINT)
    const data = await res.json()
    const { checked, healthy, healed, failed } = data
    console.log(`[heal-poller] ✅ checked=${checked} healthy=${healthy} healed=${healed} failed=${failed}`)
  } catch (err) {
    // Dev server may not be ready yet — stay quiet
    console.log(`[heal-poller] ⏳ Server not ready yet, will retry in ${INTERVAL_MS / 1000}s`)
  }
}

// Wait 60s for the dev server to boot, then start polling
console.log(`[heal-poller] Starting — will poll ${ENDPOINT} every ${INTERVAL_MS / 1000}s (first run in 60s)`)
setTimeout(() => {
  heal()
  setInterval(heal, INTERVAL_MS)
}, 60_000)
