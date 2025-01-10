// src/lib/storage.ts
import { Connection, PublicKey } from "@solana/web3.js";

export interface Transaction {
  address: string;
  amount: string;
  timestamp: number;
  signature: string;
  network: string;
}

export class TransactionStorage {
  private static readonly STORAGE_KEY = "solana_faucet_transactions";

  static getTransactions(): Transaction[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static addTransaction(tx: Transaction) {
    const transactions = this.getTransactions();
    transactions.unshift(tx);
    // Keep only last 50 transactions
    const trimmed = transactions.slice(0, 50);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
  }

  static clearTransactions() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export class WalletUtils {
  static async getBalance(
    address: string,
    connection: Connection
  ): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error("Error fetching balance:", error);
      return 0;
    }
  }

  static getExplorerUrl(signature: string, network: string): string {
    const baseUrl = "https://explorer.solana.com";
    const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
    return `${baseUrl}/tx/${signature}${cluster}`;
  }
}
