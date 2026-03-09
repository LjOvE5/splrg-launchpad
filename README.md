# SPLRG NFT Launchpad (Monad)

Frontend for the SPLRG NFT mint on **Monad Mainnet**. Connect with Phantom (primary) or MetaMask, mint with MON, and view the collection backed by Irys/Arweave.

## What’s configured

- **Contract:** `0x17A650bf86Ee22351d6FDC97b66c53E9F9384291` (Monad Mainnet)
- **Images:** Irys gateway — `https://gateway.irys.xyz/7w293UmAN7y4jbiQoB7Ls2eiYr63Qgs81ZNHWq43xbJQ/`
- **Metadata:** Irys gateway — `https://gateway.irys.xyz/5vUkF5jcznTGUznTTjJyrPiPM88E6zMTkG6HTFxPvjLt/`
- **Wallets:** Phantom (primary/recommended) and MetaMask
- **Admin panel:** Only wallet `0xf05443b49521Babda752Fa6ab8ad2B3eF51CB68f` can open `/admin`

## How to run and preview locally

1. **Install dependencies**
   ```bash
   cd "C:\Users\10\Downloads\Monad Launchpad"
   npm install
   ```

2. **Start the dev server**
   ```bash
   npm run dev
   ```

3. **Open in the browser**
   - The app may open automatically. If it doesn’t, use the **exact** URL from the terminal.
   - Vite prints something like:
     - **Local:** `http://localhost:5173/` (or `http://localhost:5174/` if 5173 is in use)
     - **Network:** `http://192.168.x.x:5173/`
   - **Important:** If you see “Port 5173 is in use, trying another one…”, the port will be **5174** (or 5175). Use that number in the URL.
   - **Manual open:** Open Chrome or Edge and type in the address bar:
     - `http://127.0.0.1:5173` or `http://127.0.0.1:5174` (use the port from the terminal).
   - If the page doesn’t load: when Windows Firewall asks to allow Node.js, click **Allow**.

4. **Preview the launchpad**
   - Open the URL above to see the main mint page.
   - Connect Phantom or MetaMask (add Monad Mainnet — Chain ID **143** — if prompted).
   - Use **Mint** to run a transaction (requires MON on Monad Mainnet).
   - Scroll down to **The Collection** to see NFT images from Irys.

5. **Preview the admin panel**
   - Connect with the admin wallet: `0xf05443b49521Babda752Fa6ab8ad2B3eF51CB68f`
   - Click the **Settings** (gear) icon in the header, or go directly to:  
     **http://localhost:5173/admin**  
   - Any other wallet that visits `/admin` is redirected back to the home page.

## Build for production

```bash
npm run build
```

Output is in `dist/`. Deploy that folder to any static host (Vercel, Netlify, etc.).

## Config and customization

- **Contract, RPC, explorer:** `src/lib/config.ts`
- **Irys URLs and admin wallet:** `src/lib/config.ts`
- **ABI:** `src/abi/NFTLaunchpadABI.json`
