// scripts/runGrader.js
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

async function executeOneTimeRun() {
  try {
    // 2. DYNAMICALLY IMPORT the files NOW that process.env is populated!
    const { poolPromise } = await import('../components/db-connect.js');
    const { gradeAllPendingEvents } =
      await import('../src/functions/grade-all-pending-events.js');

    console.log('Connecting to the database...');
    const pool = await poolPromise;

    console.log('Firing off the global grader...');
    await gradeAllPendingEvents(pool);

    console.log('All done! Closing connection.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during manual run:', error);
    process.exit(1);
  }
}

executeOneTimeRun();
