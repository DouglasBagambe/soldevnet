import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Wallet, ExternalLink, Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkPhantom = async () => {
      try {
        const phantom = (window as any).solana;
        if (phantom?.isPhantom) {
          phantom.on("connect", () => {
            setConnected(true);
            setPublicKey(phantom.publicKey.toString());
            onAddressChange(phantom.publicKey.toString());
            setLoading(false);
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
        setLoading(true);
        await phantom.connect();
      } else {
        window.open("https://phantom.app/", "_blank");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setLoading(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
      <Button
        onClick={connectWallet}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative flex items-center gap-2 px-6 py-3 
          bg-black hover:bg-black/80
          text-white font-medium
          rounded-lg border border-purple-500/30
          transition-all duration-300 ease-out
          hover:border-purple-500/60
          hover:scale-102 hover:shadow-lg
          ${loading ? "opacity-80 cursor-wait" : ""}
          overflow-hidden
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : connected ? (
          <Wallet className="text-purple-400" size={20} />
        ) : (
          <Wallet
            className={`${isHovered ? "animate-bounce" : ""} text-purple-400`}
            size={20}
          />
        )}

        <span className="relative z-10">
          {loading
            ? "Connecting..."
            : connected
            ? truncateAddress(publicKey!)
            : "Connect Phantom"}
        </span>

        {!connected && !loading && (
          <ExternalLink
            size={16}
            className="ml-1 opacity-60 group-hover:opacity-100 transition-opacity"
          />
        )}
      </Button>
    </div>
  );
};

export default PhantomWallet;
