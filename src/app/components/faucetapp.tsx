"use client";

import { useState, useEffect, SetStateAction } from "react";
import {
  Loader2,
  Droplets,
  AlertCircle,
  Wifi,
  Timer,
  History,
  ExternalLink,
} from "lucide-react";
import {
  requestAirdrop,
  getNetworkStatus,
  validateWallet,
  NetworkType,
} from "../lib/solana";
import { TransactionStorage, WalletUtils } from "../lib/storage";
import { SecurityUtils } from "../lib/security";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import ReCAPTCHA from "react-google-recaptcha";
import PhantomWallet from "./PhantomWallet";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

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
  }, []);

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    setIsCaptchaVerified(!!token);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "loading", message: "Verifying request..." });

    try {
      if (!captchaToken) {
        throw new Error("Please complete the CAPTCHA");
      }

      // Verify CAPTCHA first
      const captchaVerified = await SecurityUtils.verifyCaptcha(captchaToken);
      if (!captchaVerified) {
        throw new Error("CAPTCHA verification failed. Please try again.");
      }

      // Check rate limit
      const userIp = "user-ip"; // Ensure this is the actual user's IP
      if (!(await SecurityUtils.verifyIpLimit(userIp))) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      const captchaResponse = await fetch("/api/verifyCaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      const captchaResult = await captchaResponse.json();

      if (!captchaResult.success) {
        throw new Error("CAPTCHA verification failed");
      }

      // Request airdrop after successful CAPTCHA verification
      const result = await requestAirdrop(wallet, network);

      if (result.success) {
        TransactionStorage.addTransaction({
          address: wallet,
          amount: "1 SOL",
          timestamp: Date.now(),
          signature: result.signature!,
          network,
        });

        setStatus({ type: "success", message: result.message });
        refreshTransactions();
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
      setCaptchaToken(null);
      setIsCaptchaVerified(false);

      // Reset the CAPTCHA using the ReCAPTCHA API directly
      if (typeof window !== "undefined" && window.grecaptcha) {
        window.grecaptcha.reset(); // Resets the CAPTCHA widget
      }
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

  // Add this in your form, before the submit button
  const captchaSection = (
    <div className="mt-4 flex justify-center">
      <ReCAPTCHA
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
        onChange={handleCaptchaChange}
        theme="dark"
      />
    </div>
  );

  // Add this to your recent transactions section
  const transactionLink = (signature: string) => (
    <a
      href={WalletUtils.getExplorerUrl(signature, network)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
    >
      <ExternalLink size={12} />
      View
    </a>
  );

  // Add the wallet connection component near the top of your form
  const walletSection = (
    <div className="mb-6">
      <PhantomWallet
        onAddressChange={handleWalletConnect}
        onNetworkChange={(network) => setNetwork(network as NetworkType)}
      />
      {balance !== null && (
        <div className="mt-2 text-gray-400">
          Balance: {balance.toFixed(4)} SOL
        </div>
      )}
    </div>
  );

  const networkSelector = (
    <div className="mb-4">
      <label className="block text-gray-400 mb-2">Network</label>
      <select
        aria-label="Network"
        value={network}
        onChange={(e) => setNetwork(e.target.value as NetworkType)}
        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-purple-500/30 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-500/50"
      >
        <option value="devnet">Devnet</option>
        <option value="testnet">Testnet</option>
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_50%,_#1a1a1a,_#000)]">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="relative w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto pt-12 px-4">
        {/* Network Status Bar */}
        <div className="absolute top-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-b border-white/10 p-2">
          <div className="flex items-center justify-between max-w-4xl mx-auto px-4 text-sm">
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
              <span className="text-purple-400">{networkStatus.latency}ms</span>
            </div>
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
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {captchaSection}

              <button
                type="submit"
                disabled={loading || !wallet || !isCaptchaVerified}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Droplets className="animate-bounce" size={20} />
                )}
                {loading ? "Airdropping..." : "Request SOL"}
              </button>

              {!isCaptchaVerified && wallet && (
                <p className="text-yellow-400 text-sm mt-2">
                  Please complete the CAPTCHA verification to continue
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

          {/* Recent Transactions Panel */}
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
                  <div className="text-xs text-gray-500 mt-1">
                    {drop.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-500">
            Need help? Join our
            <a
              href="#"
              className="text-purple-400 hover:text-purple-300 ml-1 transition-colors"
            >
              Discord community
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FaucetApp;
function refreshTransactions() {
  throw new Error("Function not implemented.");
}
