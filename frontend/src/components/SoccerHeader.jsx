const SoccerHeader = ({ selectionCount }) => {
  return (
    <div className="bg-[#14161b] text-white h-16 w-full flex items-center px-6 shadow-[0_2px_10px_rgba(0,0,0,0.3)] justify-between border-b border-gray-800">
      <h1 className="text-2xl font-bold tracking-tight uppercase">
        Soccer <span className="font-light text-gray-400">Matches</span>
      </h1>

      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-4 py-1.5 rounded-full shadow-inner">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
          Bet Slip
        </span>
        <div className="w-px h-4 bg-gray-700" />
        <span className="font-black text-[#00f6ff] text-base">
          {selectionCount}
        </span>
      </div>
    </div>
  );
};

export default SoccerHeader;
