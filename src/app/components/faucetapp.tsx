"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Droplets,
  AlertCircle,
  Wifi,
  Timer,
  History,
  ExternalLink,
  Clock,
} from "lucide-react";
import {
  requestAirdrop,
  getNetworkStatus,
  NetworkType,
  getTimeUntilNextAirdrop,
} from "../lib/solana";
import { TransactionStorage, WalletUtils } from "../lib/storage";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import PhantomWallet from "./PhantomWallet";
import NetworkToggle from "./NetworkToggle";

const CountdownTimer = ({ address }: { address: string }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!address) return;

    const updateTimer = () => {
      const remainingTime = getTimeUntilNextAirdrop(address);
      setTimeRemaining(remainingTime);
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }, [address]);

  // Only show timer if there's time remaining
  if (!address || timeRemaining <= 0) return null;

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  return (
    <div className="flex items-center gap-2">
      <Clock size={16} className="text-yellow-400" />
      <span className="text-gray-400">Next Airdrop: </span>
      <span className="text-yellow-400">
        {hours}h {minutes}m {seconds}s
      </span>
    </div>
  );
};

const FaucetApp = () => {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [networkStatus, setNetworkStatus] = useState({
    latency: 0,
    status: "checking",
  });
  const [network, setNetwork] = useState<NetworkType>("devnet");
  const [recentDrops, setRecentDrops] = useState<
    Array<{
      address: string;
      amount: string;
      timestamp: string;
      signature?: string;
    }>
  >([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [solAmount, setSolAmount] = useState(1);

  // Verification state
  const [verificationQuestion, setVerificationQuestion] = useState({
    num1: 0,
    num2: 0,
  });
  const [userAnswer, setUserAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Generate new verification question
  const generateVerification = () => {
    const num1 = Math.floor(Math.random() * 20);
    const num2 = Math.floor(Math.random() * 20);
    setVerificationQuestion({ num1, num2 });
    setUserAnswer("");
    setIsVerified(false);
  };

  useEffect(() => {
    generateVerification();
  }, []);

  useEffect(() => {
    const checkNetwork = async () => {
      const status = await getNetworkStatus(network);
      setNetworkStatus(status);
    };

    const interval = setInterval(checkNetwork, 5000);
    checkNetwork();
    return () => clearInterval(interval);
  }, [network]);

  useEffect(() => {
    const loadTransactions = () => {
      const stored = TransactionStorage.getTransactions();
      setRecentDrops(
        stored.map((tx) => ({
          address: tx.address.slice(0, 6) + "...",
          amount: tx.amount,
          timestamp: new Date(tx.timestamp).toLocaleTimeString(),
          signature: tx.signature,
        }))
      );
    };

    loadTransactions();
    window.addEventListener("storage", loadTransactions);
    return () => window.removeEventListener("storage", loadTransactions);
  }, []);

  const refreshTransactions = () => {
    const stored = TransactionStorage.getTransactions();
    setRecentDrops(
      stored.map((tx) => ({
        address: tx.address.slice(0, 6) + "...",
        amount: tx.amount,
        timestamp: new Date(tx.timestamp).toLocaleTimeString(),
        signature: tx.signature,
      }))
    );
  };

  const handleVerification = () => {
    const correctAnswer = verificationQuestion.num1 + verificationQuestion.num2;
    if (parseInt(userAnswer) === correctAnswer) {
      setIsVerified(true);
      setStatus({ type: "success", message: "Verification successful!" });
    } else {
      setIsVerified(false);
      setStatus({
        type: "error",
        message: "Incorrect answer, please try again",
      });
      generateVerification();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!wallet || !isVerified) return;

    setLoading(true);
    setStatus({ type: "loading", message: "Processing request..." });

    try {
      const result = await requestAirdrop(wallet, network, solAmount); // Modified to include solAmount
      if (result.success) {
        TransactionStorage.addTransaction({
          address: wallet,
          amount: `${solAmount} SOL`,
          timestamp: Date.now(),
          signature: result.signature!,
          network,
        });

        setStatus({ type: "success", message: result.message });
        refreshTransactions();

        if (balance !== null) {
          const connection = new Connection(clusterApiUrl(network));
          const newBalance = await WalletUtils.getBalance(wallet, connection);
          setBalance(newBalance);
        }
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
      setIsVerified(false);
      generateVerification();
    }
  };

  const handleWalletConnect = async (address: string | null) => {
    if (address) {
      setWallet(address);
      const connection = new Connection(clusterApiUrl(network));
      const bal = await WalletUtils.getBalance(address, connection);
      setBalance(bal);
    }
  };

  const handleNetworkChange = (newNetwork: NetworkType) => {
    setNetwork(newNetwork);
    if (wallet) {
      const connection = new Connection(clusterApiUrl(newNetwork));
      WalletUtils.getBalance(wallet, connection).then(setBalance);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_50%,_#1a1a1a,_#000)]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="relative w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto pt-12 px-4">
        <div className="absolute top-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-b border-white/10 p-2">
          <div className="flex items-center justify-between max-w-4xl mx-auto px-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Wifi
                  size={16}
                  className={
                    networkStatus.status === "operational"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                />
                <span className="text-gray-400">Network Status: </span>
                <span
                  className={
                    networkStatus.status === "operational"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {networkStatus.status.charAt(0).toUpperCase() +
                    networkStatus.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-purple-400" />
                <span className="text-gray-400">Latency: </span>
                <span className="text-purple-400">
                  {networkStatus.latency}ms
                </span>
              </div>
            </div>
            <CountdownTimer address={wallet} />
          </div>
        </div>

        <div className="text-center mb-12 mt-8">
          <div className="relative inline-block">
            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 animate-gradient-x mb-4">
              Solana Faucet
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg opacity-0 group-hover:opacity-100 blur transition" />
          </div>
          <p className="text-gray-400 text-lg">
            Instant SOL delivery for Devnet & Testnet
          </p>
        </div>

        <div className="grid md:grid-cols-[2fr,1fr] gap-6">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-purple-500/20 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <PhantomWallet
                onAddressChange={handleWalletConnect}
                onNetworkChange={handleNetworkChange}
              />

              {balance !== null && (
                <div className="text-gray-400">
                  Balance: {balance.toFixed(4)} SOL
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <NetworkToggle network={network} onChange={handleNetworkChange} />

              <div>
                <label className="block text-gray-400 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-purple-500/30 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-500/50"
                  placeholder="Enter your Solana wallet address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-4 rounded-lg border border-purple-500/30">
                  <label className="block text-gray-400 mb-2">SOL Amount</label>
                  <select
                    title="Select SOL Amount"
                    value={solAmount}
                    onChange={(e) => setSolAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg bg-black/30 border border-purple-500/30 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5].map((amount) => (
                      <option key={amount} value={amount}>
                        {amount} SOL
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-black/30 p-4 rounded-lg border border-purple-500/30">
                  <label className="block text-gray-400 mb-2 text-sm">
                    Verification: What is {verificationQuestion.num1} +{" "}
                    {verificationQuestion.num2}?
                  </label>
                  <div className="flex gap-2 w-full">
                    <input
                      type="number"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-2/3 px-4 py-2 rounded-lg bg-black/30 border border-purple-500/30 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Answer"
                    />
                    <button
                      type="button"
                      onClick={handleVerification}
                      className="w-1/3 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !wallet || !isVerified}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Droplets className="animate-bounce" size={20} />
                )}
                {loading ? "Airdropping..." : `Request ${solAmount} SOL`}
              </button>

              {!isVerified && wallet && (
                <p className="text-yellow-400 text-sm mt-2">
                  Please complete the verification to continue
                </p>
              )}
            </form>

            {status.message && (
              <div
                className={`mt-6 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
                  status.type === "success"
                    ? "bg-green-500/20 text-green-400"
                    : status.type === "error"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-purple-500/20 text-purple-400"
                }`}
              >
                {status.type === "error" ? (
                  <AlertCircle size={20} />
                ) : (
                  <Droplets
                    size={20}
                    className={
                      status.type === "loading" ? "animate-bounce" : ""
                    }
                  />
                )}
                {status.message}
              </div>
            )}
          </div>

          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-purple-500/20">
            <div className="flex items-center gap-2 mb-4 text-gray-400">
              <History size={16} />
              <h2 className="font-semibold">Recent Airdrops</h2>
            </div>
            <div className="space-y-3">
              {recentDrops.map((drop, i) => (
                <div
                  key={i}
                  className="bg-black/30 rounded-lg p-3 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{drop.address}</span>
                    <span className="text-purple-400">{drop.amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span>{drop.timestamp}</span>
                    {drop.signature && (
                      <a
                        href={WalletUtils.getExplorerUrl(
                          drop.signature,
                          network
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                    )}
                    {drop.signature && (
                      <a
                        href={WalletUtils.getExplorerUrl(
                          drop.signature,
                          network
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-500">
            Need
            <a
              href="https://solana.com/developers/guides/getstarted/solana-token-airdrop-and-faucets"
              className="text-purple-400 hover:text-purple-300 ml-1 transition-colors"
            >
              help?
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FaucetApp;
