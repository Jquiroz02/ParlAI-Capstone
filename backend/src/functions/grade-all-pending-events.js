import { gradeEventSelections } from '../../evaluation/globalGrading.js';
export async function gradeAllPendingEvents(pool) {
  try {
    // 1. Find all completed events that still have un-settled markets
    // We use DISTINCT so we only get one row per event, even if it has multiple markets
    const pendingEventsRes = await pool.request().query(`
      SELECT DISTINCT 
          e.id AS event_id, 
          l.sport, 
          e.home_score, 
          e.away_score, 
          h.name AS home_team, 
          a.name AS away_team
      FROM events e
      INNER JOIN leagues l ON e.league_id = l.id
      INNER JOIN teams h ON e.home_team_id = h.id
      INNER JOIN teams a ON e.away_team_id = a.id
      INNER JOIN markets m ON e.id = m.event_id
      -- ONLY grab games that are finished, but still have pending markets
      WHERE e.status = 'completed' 
        AND m.status != 'settled'
        AND e.home_score IS NOT NULL 
        AND e.away_score IS NOT NULL
    `);

    const eventsToGrade = pendingEventsRes.recordset;

    if (eventsToGrade.length === 0) {
      console.log('No pending events to grade at this time.');
      return;
    }

    console.log(
      `Found ${eventsToGrade.length} events to grade. Starting batch processing...`,
    );

    // 2. Loop through each event and pass it to your existing grader
    for (const event of eventsToGrade) {
      await gradeEventSelections(
        pool,
        event.event_id,
        event.sport,
        event.home_score,
        event.away_score,
        event.home_team,
        event.away_team,
      );
    }

    console.log('Batch grading successfully completed!');
  } catch (error) {
    console.error('Failed to run batch grader:', error);
  }
}
