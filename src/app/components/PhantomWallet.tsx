// src/components/PhantomWallet.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

interface PhantomWalletProps {
  onAddressChange: (address: string | null) => void;
  onNetworkChange: (network: string) => void;
}

const PhantomWallet = ({
  onAddressChange,
  onNetworkChange,
}: PhantomWalletProps) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const checkPhantom = async () => {
      try {
        const phantom = (window as any).solana;
        if (phantom?.isPhantom) {
          phantom.on("connect", () => {
            setConnected(true);
            setPublicKey(phantom.publicKey.toString());
            onAddressChange(phantom.publicKey.toString());
          });
          phantom.on("disconnect", () => {
            setConnected(false);
            setPublicKey(null);
            onAddressChange(null);
          });
          phantom.on("networkChanged", (network: string) => {
            onNetworkChange(network);
          });
        }
      } catch (error) {
        console.error("Phantom wallet error:", error);
      }
    };

    checkPhantom();
  }, [onAddressChange, onNetworkChange]);

  const connectWallet = async () => {
    try {
      const phantom = (window as any).solana;
      if (phantom?.isPhantom) {
        await phantom.connect();
      } else {
        window.open("https://phantom.app/", "_blank");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  return (
    <Button
      onClick={connectWallet}
      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
    >
      <Wallet size={20} />
      {connected ? "Connected" : "Connect Phantom"}
    </Button>
  );
};

export default PhantomWallet;
