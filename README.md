# 🌌 GaslessSphere — UGF Space Portal

GaslessSphere is a space-themed, gasless decentralized application (dApp) built on the **Base Sepolia Testnet**. Built using the **Universal Gas Framework (UGF)**, GaslessSphere demonstrates how standard on-chain transactions—such as minting NFTs, transferring tokens, or donating—can be executed completely without holding any native gas tokens (ETH). Instead, users sign EIP-3009 transfer authorizations, and gas fees are paid seamlessly in **`TYI_MOCK_USD`**.

Built for **HackwithMumbai 3.0** National Level Hackathon.

## 🚀 Key Features

* **UGF Dashboard & Architecture**: Interactive visual guide detailing the 4-step execution flow of UGF (Payer Quote $\rightarrow$ Auth Signature $\rightarrow$ Settle & Sponsor $\rightarrow$ Execute & Confirm).
* **Gasless Space NFT Minter**: Select from premium cosmic-themed artwork presets (Cosmic Sentinel, Lunar Outpost, Nebula Core, Stellar Engine) and mint them directly to any address with zero ETH gas fee.
* **Gasless Token Sender**: Transfer ETH gaslessly. UGF sponsors the destination gas fee and settles the cost using `TYI_MOCK_USD`.
* **Gasless Donations Portal**: Support modular projects (hydroponics vertical greenhouses, radiation shielding, open-source dev) gaslessly with quick-payment buttons.
* **Dev Playground (Deployer)**: Deploy a new copy of the compiler-compiled standard `SpaceNFT` ERC-721 contract directly from the frontend, and instantly target the new collection to mint custom space assets.

---

## 🎨 Premium Visual Assets
The dApp includes high-quality, generated space-themed visual assets for user minting presets:
1. **Cosmic Sentinel**: Guardian of the deep outer orbit.
2. **Lunar Outpost**: Human base structure on the moon.
3. **Nebula Core**: Gases swirling around a cosmic black hole.
4. **Stellar Engine**: Stellar megastructure harvesting solar energy.

---

## 🔧 Architecture & Technology Stack

* **Frontend**: React 18, Vite 8, TypeScript, TailwindCSS/Vanilla CSS (curated glassmorphism design tokens).
* **Smart Contracts**: Standard `SpaceNFT` ERC-721 contract ([SpaceNFT.sol](src/contracts/SpaceNFT.sol)) compiled dynamically via customized Solc compiler scripts ([compile.js](scripts/compile.js)).
* **Web3 Integration**: Ethers.js v6 (`ethers`), Universal Gas Framework Testnet SDK (`@tychilabs/ugf-testnet-js`), and UGF React components (`@tychilabs/react-ugf`).
* **Error Resilience**: Injected custom provider parsing ([parseWalletError](src/hooks/useWallet.ts#L10-L40)) to gracefully catch and translate MetaMask RPC errors (such as `-32002` pending connections or `4001` user rejections) into human-friendly warning banners.

---

## ⚙️ How to Run Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* MetaMask Extension installed on your browser.

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd microsoft-hackthon
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the local development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 💡 How to Test & Onboard

1. **Connect Wallet**: Click **Connect Wallet** in the header. If your wallet is connected to another network, the portal will automatically request to add and switch to the **Base Sepolia Testnet**.
2. **Obtain Faucet Gas**: If you need `TYI_MOCK_USD` gas tokens, click **Open UGF Faucet** in the sidebar. This opens the faucet page where you can lock a tiny fraction of testnet Sepolia ETH to receive `TYI_MOCK_USD`.
3. **Mint Gasless NFT**: Navigate to the **Gasless NFT Minter**, choose your preset, type custom metadata, and click **Mint Gasless Space NFT**. Sign the payment in the UGF Modal, and watch the transaction confirm on-chain!
4. **Deploy & Mint Custom**: Go to the **Dev Playground**, input your collection metadata, and click **Compile & Deploy**. This initial deployment uses a small amount of standard Sepolia ETH. Once deployed, the contract address is auto-selected in your dropdown, allowing you to mint space assets gaslessly on your custom contract!
