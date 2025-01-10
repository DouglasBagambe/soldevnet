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

const AIRDROP_AMOUNT = 1 * LAMPORTS_PER_SOL;
const MAX_RETRIES = 3;
const RATE_LIMIT_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class RateLimit {
  private static airdrops: Map<string, number[]> = new Map();

  static isRateLimited(address: string): boolean {
    const drops = this.airdrops.get(address) || [];
    const recentDrops = drops.filter(
      (timestamp) => Date.now() - timestamp < RATE_LIMIT_DURATION
    );

    this.airdrops.set(address, recentDrops);
    return recentDrops.length >= 2;
  }

  static recordAirdrop(address: string): void {
    const drops = this.airdrops.get(address) || [];
    drops.push(Date.now());
    this.airdrops.set(address, drops);
  }

  static getTimeUntilNext(address: string): number {
    const drops = this.airdrops.get(address) || [];
    if (drops.length === 0) return 0;

    const oldestDrop = Math.min(...drops);
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
  network: NetworkType = "devnet"
): Promise<NetworkResponse> => {
  if (!validateWallet(address)) {
    return {
      success: false,
      message: "Invalid wallet address",
      error: "INVALID_WALLET",
    };
  }

  if (RateLimit.isRateLimited(address)) {
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

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        AIRDROP_AMOUNT
      );
      await connection.confirmTransaction(signature);

      RateLimit.recordAirdrop(address);

      return {
        success: true,
        message: `Successfully airdropped ${
          AIRDROP_AMOUNT / LAMPORTS_PER_SOL
        } SOL`,
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
