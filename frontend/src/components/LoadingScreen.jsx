const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center pt-24 text-[#00f6ff]">
    <div className="w-10 h-10 border-4 border-t-transparent border-[#00f6ff] rounded-full animate-spin mb-4" />
    <div className="text-xl font-medium tracking-wide">
      Loading live odds...
    </div>
  </div>
);

export default LoadingScreen;
