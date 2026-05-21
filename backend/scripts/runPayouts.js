// scripts/runPayouts.js
import fs from 'fs';

// 1. Manually load Azure's local.settings.json into process.env BEFORE connecting
try {
  const settingsPath = './local.settings.json';
  if (fs.existsSync(settingsPath)) {
    const rawData = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(rawData);
    if (settings.Values) {
      Object.assign(process.env, settings.Values);
      console.log('✅ Loaded environment variables from local.settings.json');
    }
  }
} catch (err) {
  console.warn('Could not load local.settings.json');
  console.error(err);
}

async function executeManualPayouts() {
  try {
    // 2. DYNAMICALLY IMPORT the files NOW that process.env is populated!
    const { poolPromise } = await import('../components/db-connect.js');

    // ADJUST THIS PATH based on where you saved settleBets.js
    const { processSettledBets } =
      await import('../evaluation/process-bet-results.js');

    console.log('Connecting to the database...');
    const pool = await poolPromise;

    console.log('Forcing a manual sweep of all pending bets...');

    // 3. Fire the payout processor
    await processSettledBets(pool);

    console.log('Manual payout sweep complete! Closing connection.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during manual payout run:', error);
    process.exit(1);
  }
}

executeManualPayouts();
