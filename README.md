# 📡 OfflineChat

A 100% offline, real-time messaging and file-sharing web application that runs on a local Windows PC and lets phones, laptops, and tablets chat without requiring an active internet connection.

---

## 🚀 Quick Start (1-Click)

Just double-click **`start.bat`** in this folder!

The batch script will:
1. Automatically verify and install dependencies (if needed).
2. Start the offline Node.js server.
3. Automatically open `http://localhost:3000` in your default browser.
4. Display a QR code in the terminal to scan with any phone on the same Wi-Fi.

---

## 🌐 3 Ways to Connect Offline (Zero Internet Required)

### 1. Same Wi-Fi Network (Home / Office / Travel Router)
- Keep both PC and mobile devices connected to the same Wi-Fi network.
- The terminal and the web app will show your local IP address (e.g. `http://192.168.1.15:3000`).
- Scan the **QR Code** with your phone camera or type the IP into Chrome/Safari/Edge.

### 2. Mobile Hotspot (No Internet / Router Needed!)
- Turn on your phone's **Mobile Hotspot** (Mobile Data can stay **OFF**!).
- Connect your PC/laptop to this phone hotspot.
- Run `start.bat` on the PC.
- Scan the QR code or visit `http://<PC_IP>:3000` from the phone.
- All connected devices can now chat and exchange files at maximum local wireless speed!

### 3. Bluetooth Connection Modes
- **Bluetooth PAN / Tethering (Full Rich Media)**:
  1. Pair your phone and PC in Windows Bluetooth settings.
  2. On the phone or PC, enable **Bluetooth Tethering** (Personal Area Network).
  3. The server automatically detects the Bluetooth network adapter and assigns a direct Bluetooth IP address (e.g. `http://192.168.44.1:3000`).
  4. Open the Bluetooth IP on your phone to chat, send voice notes, and transfer files!
- **Direct Web Bluetooth (BLE)**:
  1. Open the web app in Google Chrome or Microsoft Edge.
  2. Click the **Bluetooth** tab in the sidebar.
  3. Click **"Scan & Pair BLE Device"** to discover and communicate with nearby Bluetooth Low Energy devices directly from the browser.

---

## ✨ Features

- **100% Offline**: Works completely independent of the internet, cloud servers, or external APIs.
- **Local Persistence**: Messages, chat rooms, and uploaded files are saved locally on the host machine (`./data/db.json` and `./uploads/`).
- **Voice Notes**: In-browser voice recorder (microphone) with live timer and custom audio player.
- **High-Speed LAN File Sharing**: Transfer images, PDFs, videos, and documents at full Wi-Fi/LAN speed.
- **Image Lightbox**: Preview shared photos full screen with one click.
- **Instant QR Pairing**: Dynamic QR code generator in terminal and header modal.
- **Sound Notifications**: Built-in sound synthesis chime for incoming messages.
- **Typing Indicators**: Real-time "User is typing..." presence.
- **PWA Ready**: Can be installed to the homescreen on Android, iOS, and Windows.
- **Dark & Light Modes**: Clean modern UI with responsive mobile navigation drawer.

---

## 🛠 Manual Command-Line Startup

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode with auto-reload
npm run dev
```
