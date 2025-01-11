import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import bs58 from "bs58";

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
const RATE_LIMIT_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DAILY_SOL = 5; // Maximum SOL per 24 hours

class RateLimit {
  private static airdrops: Map<string, AirdropRecord[]> = new Map();

  static isRateLimited(address: string, requestedAmount: number): boolean {
    const drops = this.airdrops.get(address) || [];
    const recentDrops = drops.filter(
      (drop) => Date.now() - drop.timestamp < RATE_LIMIT_DURATION
    );

    // Calculate total SOL received in the last 24 hours
    const totalReceivedSOL = recentDrops.reduce(
      (sum, drop) => sum + drop.amount,
      0
    );

    this.airdrops.set(address, recentDrops);
    return totalReceivedSOL + requestedAmount > MAX_DAILY_SOL;
  }

  static recordAirdrop(address: string, amount: number): void {
    const drops = this.airdrops.get(address) || [];
    drops.push({ timestamp: Date.now(), amount });
    this.airdrops.set(address, drops);
  }

  static getRemainingAllowance(address: string): number {
    const drops = this.airdrops.get(address) || [];
    const recentDrops = drops.filter(
      (drop) => Date.now() - drop.timestamp < RATE_LIMIT_DURATION
    );
    const totalReceived = recentDrops.reduce(
      (sum, drop) => sum + drop.amount,
      0
    );
    return Math.max(0, MAX_DAILY_SOL - totalReceived);
  }

  static getTimeUntilNext(address: string): number {
    const drops = this.airdrops.get(address) || [];
    if (drops.length === 0) return 0;

    const oldestDrop = Math.min(...drops.map((drop) => drop.timestamp));
    return Math.max(0, RATE_LIMIT_DURATION - (Date.now() - oldestDrop));
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
  amount: number = 1 // Default to 1 SOL if not specified
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

  if (RateLimit.isRateLimited(address, amount)) {
    const remainingAllowance = RateLimit.getRemainingAllowance(address);
    if (remainingAllowance > 0) {
      return {
        success: false,
        message: `You can only request up to ${remainingAllowance} more SOL in the next 24 hours`,
        error: "RATE_LIMITED",
      };
    }
    const waitTime = RateLimit.getTimeUntilNext(address);
    const hours = Math.ceil(waitTime / (1000 * 60 * 60));
    return {
      success: false,
      message: `Rate limited. Try again in ${hours} hours`,
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
