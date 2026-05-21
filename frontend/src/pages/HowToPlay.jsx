const STEPS = [
  {
    title: 'Pick a League',
    body: 'Choose NBA, NFL, or another supported League to see available games and player props.',
  },
  {
    title: 'Find player or team',
    body: 'Search or browse to pull up stats, trends , and upcoming matchups.',
  },
  {
    title: 'Check the prediction',
    body: ' How we check prediction is based off of historical plus recent perfomance data to predict what might happen next game.',
  },
  {
    title: 'The Risk of making money',
    body: 'Predictions help yo make smarter choices, but not everything in this sports world is guarenteed.',
  },
];

export default function HowToPlay() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 text-slate-100">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">How to Play</h1>
        <p className="mt-2 text-slate-300">
          A quick guide to using ParlAI predictions and understanding
          confidence.
        </p>
      </header>

      <section className="grid gap-4">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
          >
            <h2 className="text-lg font-semibold">
              Step {i + 1}: <span className="text-slate-100">{step.title}</span>
            </h2>
            <p className="mt-2 text-slate-300">{step.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Disclaimer:</span>{' '}
          ParlAI provides statistical insights for educational/entertainment
          purposes. It is not financial or betting advice.
        </p>
      </div>
    </main>
  );
}
