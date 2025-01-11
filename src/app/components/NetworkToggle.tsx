import { useState } from "react";

const NetworkToggle = ({ network, onChange }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (newNetwork) => {
    if (network === newNetwork || isAnimating) return;

    setIsAnimating(true);
    onChange(newNetwork);
    setTimeout(() => setIsAnimating(false), 600); // Match animation duration
  };

  return (
    <div className="space-y-2">
      <div className="relative flex bg-black/30 p-1 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all">
        {/* Animated Background Highlight */}
        <div
          className={`absolute h-[calc(100%-8px)] w-[calc(50%-4px)] top-1 rounded-lg bg-gradient-to-r from-purple-600/50 to-pink-600/50 transition-all duration-500 ease-in-out ${
            network === "devnet" ? "left-1" : "left-[calc(50%+4px)]"
          }`}
        />

        {/* Glowing Orb */}
        <div
          className={`absolute w-3 h-3 rounded-full bg-purple-400 blur-sm transition-all duration-500 ease-in-out ${
            network === "devnet" ? "left-[20%]" : "left-[70%]"
          }`}
        />

        {/* Network Options */}
        <button
          onClick={() => handleClick("devnet")}
          className={`flex-1 relative px-4 py-2 rounded-lg font-medium transition-all ${
            network === "devnet"
              ? "text-white scale-105"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Devnet
          {network === "devnet" && (
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => handleClick("testnet")}
          className={`flex-1 relative px-4 py-2 rounded-lg font-medium transition-all ${
            network === "testnet"
              ? "text-white scale-105"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Testnet
          {network === "testnet" && (
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};

export default NetworkToggle;
