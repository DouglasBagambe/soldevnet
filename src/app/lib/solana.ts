import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

export type NetworkType = "devnet" | "testnet";

interface NetworkResponse {
  success: boolean;
  message: string;
  signature?: string;
  error?: string;
}

interface AirdropRecord {
  timestamp: number;
  amount: number;
}

const MAX_RETRIES = 3;
const COOLDOWN_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
// const MAX_DAILY_SOL = 5;

class RateLimit {
  private static STORAGE_KEY = "solana-faucet-airdrops";

  private static loadAirdrops(): Map<string, AirdropRecord[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return new Map();

      const parsed = JSON.parse(stored);
      const map = new Map();
      Object.entries(parsed).forEach(([key, value]) => {
        map.set(key, value as AirdropRecord[]);
      });
      return map;
    } catch {
      return new Map();
    }
  }

  private static saveAirdrops(airdrops: Map<string, AirdropRecord[]>) {
    const obj = Object.fromEntries(airdrops.entries());
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
  }

  static isRateLimited(address: string): boolean {
    const airdrops = this.loadAirdrops();
    const drops = airdrops.get(address) || [];
    const lastDrop = drops[drops.length - 1];

    if (lastDrop && Date.now() - lastDrop.timestamp < COOLDOWN_DURATION) {
      return true;
    }

    const recentDrops = drops.filter(
      (drop) => Date.now() - drop.timestamp < COOLDOWN_DURATION
    );

    // Update storage with cleaned up records
    airdrops.set(address, recentDrops);
    this.saveAirdrops(airdrops);

    return recentDrops.length > 0;
  }

  static recordAirdrop(address: string, amount: number): void {
    const airdrops = this.loadAirdrops();
    const drops = airdrops.get(address) || [];
    drops.push({ timestamp: Date.now(), amount });
    airdrops.set(address, drops);
    this.saveAirdrops(airdrops);
  }

  static getTimeUntilNext(address: string): number {
    const airdrops = this.loadAirdrops();
    const drops = airdrops.get(address) || [];
    if (drops.length === 0) return 0;

    const lastDrop = drops[drops.length - 1];
    const timeElapsed = Date.now() - lastDrop.timestamp;
    return Math.max(0, COOLDOWN_DURATION - timeElapsed);
  }

  static canRequestAirdrop(address: string): boolean {
    return this.getTimeUntilNext(address) === 0;
  }
}

export const validateWallet = (address: string): boolean => {
  try {
    const publicKey = new PublicKey(address);
    return PublicKey.isOnCurve(publicKey.toBytes());
  } catch {
    return false;
  }
};

export const requestAirdrop = async (
  address: string,
  network: NetworkType = "devnet",
  amount: number = 1
): Promise<NetworkResponse> => {
  if (!validateWallet(address)) {
    return {
      success: false,
      message: "Invalid wallet address",
      error: "INVALID_WALLET",
    };
  }

  if (amount <= 0 || amount > 5) {
    return {
      success: false,
      message: "Invalid amount. Please request between 1 and 5 SOL",
      error: "INVALID_AMOUNT",
    };
  }

  if (RateLimit.isRateLimited(address)) {
    const waitTime = RateLimit.getTimeUntilNext(address);
    const minutes = Math.ceil(waitTime / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return {
      success: false,
      message: `Please wait ${hours}h ${remainingMinutes}m before requesting another airdrop`,
      error: "RATE_LIMITED",
    };
  }

  const connection = new Connection(clusterApiUrl(network));
  const publicKey = new PublicKey(address);
  const lamports = amount * LAMPORTS_PER_SOL;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const signature = await connection.requestAirdrop(publicKey, lamports);
      await connection.confirmTransaction(signature);

      RateLimit.recordAirdrop(address, amount);

      return {
        success: true,
        message: `Successfully airdropped ${amount} SOL`,
        signature,
      };
    } catch (error) {
      if (i === MAX_RETRIES - 1) {
        return {
          success: false,
          message: "Airdrop failed after multiple attempts",
          error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
        };
      }
    }
  }

  return {
    success: false,
    message: "Unexpected error occurred",
    error: "UNKNOWN_ERROR",
  };
};

export const getNetworkStatus = async (
  network: NetworkType = "devnet"
): Promise<{
  latency: number;
  status: string;
}> => {
  try {
    const connection = new Connection(clusterApiUrl(network));
    const start = Date.now();
    await connection.getVersion();
    return {
      latency: Date.now() - start,
      status: "operational",
    };
  } catch {
    return {
      latency: 0,
      status: "error",
    };
  }
};

export const getTimeUntilNextAirdrop = (address: string): number => {
  return RateLimit.getTimeUntilNext(address);
};
