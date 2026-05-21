import SoccerCard from '../components/SoccerCard';
import SoccerHeader from '../components/SoccerHeader';
import LoadingScreen from '../components/LoadingScreen';
import { useGlobalBetSlip } from '../context/BetSlipContext';
import { getSoccerGames } from '../hooks/getSoccerGames.js';
import { isBettingClosed } from '../utils/betPayload.js';

const SoccerPage = () => {
  const { selections, toggleSelection, pruneSelectionsForGames } =
    useGlobalBetSlip();

  const { games, loading } = getSoccerGames(pruneSelectionsForGames);

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f14] relative">
      <SoccerHeader selectionCount={selections.length} />

      {loading ? (
        <LoadingScreen />
      ) : (
        <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 align-top items-start pb-40">
          {games.length === 0 ? (
            <div className="text-gray-500 col-span-full text-center mt-16 text-lg border border-dashed border-gray-800 rounded-lg py-12">
              No games scheduled at this moment.
            </div>
          ) : (
            games.map((game) => (
              //console.log(game),
              <SoccerCard
                key={game.id}
                game={game}
                onToggleBet={toggleSelection}
                selectedBets={selections}
                bettingClosed={isBettingClosed(game)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SoccerPage;
