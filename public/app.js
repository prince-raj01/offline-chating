/**
 * OfflineChat - Client Application Logic
 * Supports: Local Wi-Fi, Mobile Hotspot, Bluetooth PAN, and Web Bluetooth (BLE)
 */

(function () {
  'use strict';

  // --- STATE & IDENTITY ---
  const state = {
    user: {
      id: localStorage.getItem('oc_user_id') || 'user_' + Math.random().toString(36).substr(2, 9),
      username: localStorage.getItem('oc_username') || 'User_' + Math.floor(1000 + Math.random() * 9000),
      avatar: localStorage.getItem('oc_avatar') || '#3b82f6',
      deviceType: getDeviceType()
    },
    currentRoom: 'general',
    rooms: [],
    users: [],
    typingTimeout: null,
    isTyping: false,
    theme: localStorage.getItem('oc_theme') || 'dark',
    activeMode: 'lan', // 'lan' or 'bluetooth'
    mediaRecorder: null,
    audioChunks: [],
    recordingTimerInterval: null,
    recordingSeconds: 0,
    webBluetoothDevice: null,
    webBluetoothServer: null,
    webBluetoothRxChar: null,
    webBluetoothTxChar: null
  };

  localStorage.setItem('oc_user_id', state.user.id);
  localStorage.setItem('oc_username', state.user.username);
  localStorage.setItem('oc_avatar', state.user.avatar);

  // Avatar color palette
  const AVATAR_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'
  ];

  // Common Emojis
  const EMOJIS = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😋', '😛', '😜', '🤪', '🤩', '🥳',
    '👍', '👎', '👌', '✌️', '🤞', '👏', '🙌', '🤝',
    '🔥', '✨', '🎉', '💡', '❤️', '🧡', '💛', '💚',
    '💙', '💜', '🖤', '💯', '🚀', '📡', '📱', '💻'
  ];

  // --- DOM ELEMENTS ---
  const els = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    myAvatar: document.getElementById('myAvatar'),
    myAvatarInitial: document.getElementById('myAvatarInitial'),
    myUsername: document.getElementById('myUsername'),
    myDeviceTag: document.getElementById('myDeviceTag'),
    editUsernameBtn: document.getElementById('editUsernameBtn'),
    tabLanMode: document.getElementById('tabLanMode'),
    tabBtMode: document.getElementById('tabBtMode'),
    lanChannelsSection: document.getElementById('lanChannelsSection'),
    btControlsSection: document.getElementById('btControlsSection'),
    roomsList: document.getElementById('roomsList'),
    openCreateRoomBtn: document.getElementById('openCreateRoomBtn'),
    onlineUsersList: document.getElementById('onlineUsersList'),
    userCount: document.getElementById('userCount'),
    openConnectModalBtn: document.getElementById('openConnectModalBtn'),

    // Bluetooth Sidebar
    btStatusText: document.getElementById('btStatusText'),
    btScanBtn: document.getElementById('btScanBtn'),
    btDeviceInfo: document.getElementById('btDeviceInfo'),
    btConnectedName: document.getElementById('btConnectedName'),
    btDisconnectBtn: document.getElementById('btDisconnectBtn'),
    openBtGuideBtn: document.getElementById('openBtGuideBtn'),

    // Header
    activeRoomPrefix: document.getElementById('activeRoomPrefix'),
    activeRoomTitle: document.getElementById('activeRoomTitle'),
    activeRoomDesc: document.getElementById('activeRoomDesc'),
    connectionBadge: document.getElementById('connectionBadge'),
    headerQrBtn: document.getElementById('headerQrBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),

    // Chat Area
    messagesContainer: document.getElementById('messagesContainer'),
    typingIndicator: document.getElementById('typingIndicator'),
    typingText: document.getElementById('typingText'),
    chatInputArea: document.getElementById('chatInputArea'),
    dropOverlay: document.getElementById('dropOverlay'),
    messageInput: document.getElementById('messageInput'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    fileInput: document.getElementById('fileInput'),
    emojiBtn: document.getElementById('emojiBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    emojiGrid: document.getElementById('emojiGrid'),
    recordVoiceBtn: document.getElementById('recordVoiceBtn'),
    sendBtn: document.getElementById('sendBtn'),

    // Voice record bar
    voiceRecordBar: document.getElementById('voiceRecordBar'),
    recordingTimer: document.getElementById('recordingTimer'),
    cancelVoiceBtn: document.getElementById('cancelVoiceBtn'),
    sendVoiceBtn: document.getElementById('sendVoiceBtn'),

    // Modals
    connectModal: document.getElementById('connectModal'),
    closeConnectModal: document.getElementById('closeConnectModal'),
    qrTabWifi: document.getElementById('qrTabWifi'),
    qrTabBluetooth: document.getElementById('qrTabBluetooth'),
    qrTabHelp: document.getElementById('qrTabHelp'),
    qrPanelWifi: document.getElementById('qrPanelWifi'),
    qrPanelBluetooth: document.getElementById('qrPanelBluetooth'),
    qrPanelHelp: document.getElementById('qrPanelHelp'),
    primaryQrImage: document.getElementById('primaryQrImage'),
    qrLoading: document.getElementById('qrLoading'),
    primaryNetworkUrl: document.getElementById('primaryNetworkUrl'),
    copyUrlBtn: document.getElementById('copyUrlBtn'),
    otherIpsList: document.getElementById('otherIpsList'),
    btPanList: document.getElementById('btPanList'),

    profileModal: document.getElementById('profileModal'),
    closeProfileModal: document.getElementById('closeProfileModal'),
    usernameInput: document.getElementById('usernameInput'),
    colorPalette: document.getElementById('colorPalette'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),

    createRoomModal: document.getElementById('createRoomModal'),
    closeCreateRoomModal: document.getElementById('closeCreateRoomModal'),
    newRoomName: document.getElementById('newRoomName'),
    newRoomDesc: document.getElementById('newRoomDesc'),
    confirmCreateRoomBtn: document.getElementById('confirmCreateRoomBtn'),

    lightboxModal: document.getElementById('lightboxModal'),
    closeLightboxBtn: document.getElementById('closeLightboxBtn'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxDownloadBtn: document.getElementById('lightboxDownloadBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  // --- INITIALIZATION ---
  function init() {
    initTheme();
    updateUserDisplay();
    populateEmojiPicker();
    populateColorPalette();
    checkWebBluetoothSupport();
    initSocket();
    fetchNetworkInfo();
    fetchRooms();
    setupEventListeners();
    registerServiceWorker();
  }

  // Device type detection
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return 'Phone';
    return 'Desktop';
  }

  // --- THEME ---
  function initTheme() {
    document.body.className = state.theme === 'light' ? 'light-theme' : 'dark-theme';
    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    if (darkIcon && lightIcon) {
      if (state.theme === 'light') {
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
      } else {
        darkIcon.classList.remove('hidden');
        lightIcon.classList.add('hidden');
      }
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('oc_theme', state.theme);
    initTheme();
  }

  // --- USER DISPLAY ---
  function updateUserDisplay() {
    els.myUsername.textContent = state.user.username;
    els.myAvatarInitial.textContent = state.user.username.charAt(0).toUpperCase();
    els.myAvatar.style.backgroundColor = state.user.avatar;
    els.myDeviceTag.textContent = `${state.user.deviceType} • LAN`;
  }

  function populateColorPalette() {
    els.colorPalette.innerHTML = '';
    AVATAR_COLORS.forEach(color => {
      const opt = document.createElement('div');
      opt.className = `color-option ${color === state.user.avatar ? 'selected' : ''}`;
      opt.style.backgroundColor = color;
      opt.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        state.selectedTempColor = color;
      });
      els.colorPalette.appendChild(opt);
    });
  }

  function populateEmojiPicker() {
    els.emojiGrid.innerHTML = '';
    EMOJIS.forEach(emoji => {
      const item = document.createElement('div');
      item.className = 'emoji-item';
      item.textContent = emoji;
      item.addEventListener('click', () => {
        insertAtCursor(els.messageInput, emoji);
        els.emojiPicker.classList.add('hidden');
        els.messageInput.focus();
      });
      els.emojiGrid.appendChild(item);
    });
  }

  function insertAtCursor(input, text) {
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = input.value;
    input.value = val.substring(0, start) + text + val.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
    autoResizeInput();
  }

  // --- AUDIO SYNTHESIS SOUND NOTIFICATION ---
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }

  // --- SOCKET.IO CLIENT ---
  let socket = null;

  function initSocket() {
    try {
      socket = io({
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        console.log('[Socket Connected] Joining offline room:', state.currentRoom);
        els.connectionBadge.textContent = 'LAN Active';
        els.connectionBadge.className = 'badge badge-success';
        
        socket.emit('user:join', {
          id: state.user.id,
          username: state.user.username,
          avatar: state.user.avatar,
          deviceType: state.user.deviceType,
          room: state.currentRoom
        });
      });

      socket.on('disconnect', () => {
        els.connectionBadge.textContent = 'Reconnecting...';
        els.connectionBadge.className = 'badge';
      });

      socket.on('users:update', (users) => {
        state.users = users;
        renderUsersList();
      });

      socket.on('room:created', (newRoom) => {
        if (!state.rooms.some(r => r.id === newRoom.id)) {
          state.rooms.push(newRoom);
          renderRoomsList();
        }
      });

      socket.on('message:history', (messages) => {
        els.messagesContainer.innerHTML = '';
        renderWelcomeBanner();
        messages.forEach(msg => appendMessage(msg, false));
        scrollToBottom();
      });

      socket.on('message:new', (msg) => {
        appendMessage(msg, true);
        if (msg.senderId !== state.user.id && !msg.isSystem) {
          playBeep();
        }
      });

      socket.on('user:typing', ({ username, isTyping }) => {
        if (isTyping) {
          els.typingText.textContent = `${username} is typing...`;
          els.typingIndicator.classList.remove('hidden');
        } else {
          els.typingIndicator.classList.add('hidden');
        }
      });
    } catch (err) {
      console.error('Socket.IO init error:', err);
    }
  }

  // --- ROOMS & USERS ---
  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        state.rooms = await res.json();
        renderRoomsList();
      }
    } catch (e) {
      console.warn('Could not fetch rooms list:', e);
    }
  }

  function renderRoomsList() {
    els.roomsList.innerHTML = '';
    state.rooms.forEach(room => {
      const div = document.createElement('div');
      div.className = `room-item ${room.id === state.currentRoom ? 'active' : ''}`;
      div.innerHTML = `<span class="prefix">#</span> <span>${escapeHtml(room.name)}</span>`;
      div.addEventListener('click', () => switchRoom(room));
      els.roomsList.appendChild(div);
    });
  }

  function switchRoom(room) {
    if (state.currentRoom === room.id) return;
    state.currentRoom = room.id;
    els.activeRoomPrefix.textContent = '#';
    els.activeRoomTitle.textContent = room.name;
    els.activeRoomDesc.textContent = room.description || '';
    renderRoomsList();
    
    if (socket && socket.connected) {
      socket.emit('room:join', { room: room.id });
    }

    // Close mobile sidebar if open
    closeMobileSidebar();
  }

  function renderUsersList() {
    els.onlineUsersList.innerHTML = '';
    els.userCount.textContent = state.users.length;
    
    state.users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'user-item';
      div.innerHTML = `
        <div class="user-item-avatar" style="background-color: ${u.avatar || '#3b82f6'}">
          ${(u.username || 'U').charAt(0).toUpperCase()}
        </div>
        <span class="user-item-name">${escapeHtml(u.username)}${u.id === state.user.id ? ' (You)' : ''}</span>
        <span class="user-item-badge">${u.deviceType || 'LAN'}</span>
      `;
      els.onlineUsersList.appendChild(div);
    });
  }

  // --- MESSAGING ---
  function sendMessage() {
    const text = els.messageInput.value.trim();
    if (!text) return;

    if (state.activeMode === 'bluetooth' && state.webBluetoothTxChar) {
      sendWebBluetoothMessage(text);
      els.messageInput.value = '';
      autoResizeInput();
      return;
    }

    if (socket && socket.connected) {
      socket.emit('message:send', {
        room: state.currentRoom,
        text
      });
      emitTyping(false);
    }

    els.messageInput.value = '';
    autoResizeInput();
    els.messageInput.focus();
  }

  function emitTyping(isTyping) {
    if (!socket || !socket.connected) return;
    if (state.isTyping !== isTyping) {
      state.isTyping = isTyping;
      socket.emit('user:typing', {
        room: state.currentRoom,
        isTyping
      });
    }
  }

  function renderWelcomeBanner() {
    const banner = document.createElement('div');
    banner.className = 'offline-welcome-banner';
    banner.innerHTML = `
      <div class="welcome-icon">📡</div>
      <h3>Offline Local Hub is Ready</h3>
      <p>Chat, record voice notes, and share files at full local network speed with zero internet access required.</p>
      <div class="welcome-chips">
        <span class="chip">🔒 Zero Cloud / 100% Private</span>
        <span class="chip">🚀 Fast Local Wi-Fi & Hotspot</span>
        <span class="chip">⚡ Bluetooth Supported</span>
      </div>
    `;
    els.messagesContainer.appendChild(banner);
  }

  function appendMessage(msg, shouldScroll = true) {
    if (msg.isSystem) {
      const sysRow = document.createElement('div');
      sysRow.className = 'system-message-row';
      sysRow.innerHTML = `<span class="system-message-text">${escapeHtml(msg.text)}</span>`;
      els.messagesContainer.appendChild(sysRow);
    } else {
      const isOut = msg.senderId === state.user.id;
      const row = document.createElement('div');
      row.className = `message-row ${isOut ? 'outgoing' : 'incoming'}`;

      const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let mediaHtml = '';

      // Image Attachment
      if (msg.file && msg.file.mimetype && msg.file.mimetype.startsWith('image/')) {
        mediaHtml += `
          <img src="${msg.file.url}" class="message-image" alt="Shared photo" onclick="window.openLightbox('${msg.file.url}')">
        `;
      }
      // Non-Image File Attachment
      else if (msg.file) {
        mediaHtml += `
          <div class="message-file-card">
            <span class="file-icon">📄</span>
            <div class="file-info">
              <div class="file-name" title="${escapeHtml(msg.file.originalname)}">${escapeHtml(msg.file.originalname)}</div>
              <div class="file-size">${formatBytes(msg.file.size)}</div>
            </div>
            <a href="${msg.file.url}" download="${escapeHtml(msg.file.originalname)}" class="file-download-btn" title="Download">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
          </div>
        `;
      }

      // Voice Note
      if (msg.voice && msg.voice.url) {
        mediaHtml += createAudioPlayerHtml(msg.voice.url);
      }

      const textHtml = msg.text ? `<p class="message-text">${linkify(escapeHtml(msg.text))}</p>` : '';

      row.innerHTML = `
        <div class="message-avatar" style="background-color: ${msg.avatar || '#3b82f6'}">
          ${(msg.sender || 'U').charAt(0).toUpperCase()}
        </div>
        <div class="message-content-wrapper">
          <div class="message-meta">
            <span class="message-sender">${escapeHtml(msg.sender)}</span>
            <span class="message-time">${timeStr}</span>
          </div>
          <div class="message-bubble">
            ${textHtml}
            ${mediaHtml}
          </div>
        </div>
      `;

      els.messagesContainer.appendChild(row);
      initAudioPlayers(row);
    }

    if (shouldScroll) {
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
    });
  }

  // --- AUDIO PLAYER LOGIC ---
  function createAudioPlayerHtml(url) {
    return `
      <div class="audio-player-card" data-audio-src="${url}">
        <button class="audio-play-btn" aria-label="Play audio">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <div class="audio-track">
          <div class="audio-progress">
            <div class="audio-progress-fill"></div>
          </div>
          <span class="audio-duration">00:00</span>
        </div>
      </div>
    `;
  }

  function initAudioPlayers(container) {
    const cards = container.querySelectorAll('.audio-player-card');
    cards.forEach(card => {
      const src = card.getAttribute('data-audio-src');
      const playBtn = card.querySelector('.audio-play-btn');
      const progress = card.querySelector('.audio-progress');
      const progressFill = card.querySelector('.audio-progress-fill');
      const durationSpan = card.querySelector('.audio-duration');

      const audio = new Audio(src);

      audio.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        const pct = (audio.currentTime / (audio.duration || 1)) * 100;
        progressFill.style.width = pct + '%';
        durationSpan.textContent = formatDuration(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        progressFill.style.width = '0%';
        durationSpan.textContent = formatDuration(audio.duration);
      });

      playBtn.addEventListener('click', () => {
        if (audio.paused) {
          // Pause all other audios
          document.querySelectorAll('audio').forEach(a => a.pause());
          audio.play();
          playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        } else {
          audio.pause();
          playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
      });

      progress.addEventListener('click', (e) => {
        const rect = progress.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        if (audio.duration) {
          audio.currentTime = pos * audio.duration;
        }
      });
    });
  }

  // --- VOICE RECORDING (MediaRecorder API) ---
  async function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Audio recording is not supported in this browser.', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];
      state.recordingSeconds = 0;

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const supportedMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

      state.mediaRecorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.audioChunks.push(e.data);
      };

      state.mediaRecorder.start(250);

      // UI update
      els.chatInputArea.classList.add('hidden');
      els.voiceRecordBar.classList.remove('hidden');
      els.recordingTimer.textContent = '00:00';

      state.recordingTimerInterval = setInterval(() => {
        state.recordingSeconds++;
        els.recordingTimer.textContent = formatDuration(state.recordingSeconds);
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied:', err);
      showToast('Microphone access was denied or unavailable.', 'error');
    }
  }

  function stopVoiceRecording(shouldSend) {
    clearInterval(state.recordingTimerInterval);

    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = async () => {
        // Stop audio tracks
        state.mediaRecorder.stream.getTracks().forEach(track => track.stop());

        if (shouldSend && state.audioChunks.length > 0) {
          const mime = state.mediaRecorder.mimeType || 'audio/webm';
          const ext = mime.includes('mp4') ? 'm4a' : (mime.includes('ogg') ? 'ogg' : 'webm');
          const audioBlob = new Blob(state.audioChunks, { type: mime });

          const formData = new FormData();
          formData.append('file', audioBlob, `voice-note-${Date.now()}.${ext}`);

          showToast('Uploading offline voice note...', 'info');
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            if (data.success) {
              socket.emit('message:send', {
                room: state.currentRoom,
                voice: {
                  url: data.url,
                  duration: state.recordingSeconds
                }
              });
            }
          } catch (e) {
            showToast('Failed to send voice note offline', 'error');
          }
        }
      };

      state.mediaRecorder.stop();
    }

    // Reset UI
    els.voiceRecordBar.classList.add('hidden');
    els.chatInputArea.classList.remove('hidden');
  }

  // --- FILE UPLOADS (LAN Transfer) ---
  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      showToast(`Transferring ${file.name} over LAN...`, 'info');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          socket.emit('message:send', {
            room: state.currentRoom,
            file: {
              url: data.url,
              originalname: data.originalname,
              mimetype: data.mimetype,
              size: data.size
            }
          });
        } else {
          showToast(`Upload failed: ${data.error}`, 'error');
        }
      } catch (err) {
        showToast(`Offline transfer failed for ${file.name}`, 'error');
      }
    }
  }

  // --- WEB BLUETOOTH (BLE Direct Device-to-Device) ---
  const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const NORDIC_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Characteristic to write to
  const NORDIC_RX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Characteristic to receive from

  function checkWebBluetoothSupport() {
    if ('bluetooth' in navigator) {
      els.btStatusText.textContent = 'Web Bluetooth is supported!';
      els.btScanBtn.disabled = false;
    } else {
      els.btStatusText.textContent = 'Web Bluetooth not supported on this browser. Use Chrome/Edge or Bluetooth PAN.';
      els.btScanBtn.disabled = true;
    }
  }

  async function scanWebBluetooth() {
    if (!('bluetooth' in navigator)) {
      showToast('Web Bluetooth API is not supported in this browser.', 'error');
      return;
    }

    try {
      showToast('Scanning for nearby Bluetooth devices...', 'info');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [NORDIC_UART_SERVICE, 'generic_access']
      });

      state.webBluetoothDevice = device;
      els.btConnectedName.textContent = device.name || `Device (${device.id.slice(0, 6)})`;
      els.btDeviceInfo.classList.remove('hidden');
      els.btStatusText.textContent = 'Connecting to GATT Server...';

      device.addEventListener('gattserverdisconnected', onBluetoothDisconnected);

      const server = await device.gatt.connect();
      state.webBluetoothServer = server;
      els.btStatusText.textContent = 'Connected via BLE!';
      els.connectionBadge.textContent = 'BLE Connected';
      els.connectionBadge.className = 'badge badge-bluetooth';
      showToast(`Paired with ${device.name || 'Bluetooth Device'}!`, 'info');

      // Attempt to discover Nordic UART or custom characteristics
      try {
        const service = await server.getPrimaryService(NORDIC_UART_SERVICE);
        state.webBluetoothTxChar = await service.getCharacteristic(NORDIC_TX_CHAR);
        state.webBluetoothRxChar = await service.getCharacteristic(NORDIC_RX_CHAR);

        await state.webBluetoothRxChar.startNotifications();
        state.webBluetoothRxChar.addEventListener('characteristicvaluechanged', (e) => {
          const decoder = new TextDecoder('utf-8');
          const value = decoder.decode(e.target.value);
          appendMessage({
            id: 'ble-' + Date.now(),
            sender: state.webBluetoothDevice.name || 'Bluetooth Peer',
            senderId: 'bt-peer',
            text: value,
            avatar: '#38bdf8',
            timestamp: Date.now()
          });
        });
      } catch (serviceErr) {
        console.log('UART GATT characteristics not active, connected as raw BLE peripheral.');
      }

    } catch (err) {
      console.warn('Web Bluetooth scan cancelled or failed:', err);
      showToast(err.message || 'Bluetooth connection cancelled', 'error');
      els.btStatusText.textContent = 'Scan cancelled or failed.';
    }
  }

  async function sendWebBluetoothMessage(text) {
    if (!state.webBluetoothTxChar) {
      showToast('Direct BLE write characteristic not available on target device. Using local echo.', 'info');
      appendMessage({
        id: 'ble-' + Date.now(),
        sender: state.user.username + ' (BLE)',
        senderId: state.user.id,
        text: text,
        avatar: state.user.avatar,
        timestamp: Date.now()
      });
      return;
    }

    try {
      const encoder = new TextEncoder();
      await state.webBluetoothTxChar.writeValue(encoder.encode(text));
      appendMessage({
        id: 'ble-' + Date.now(),
        sender: state.user.username + ' (BLE)',
        senderId: state.user.id,
        text: text,
        avatar: state.user.avatar,
        timestamp: Date.now()
      });
    } catch (e) {
      showToast('Failed to transmit packet over BLE', 'error');
    }
  }

  function onBluetoothDisconnected() {
    els.btStatusText.textContent = 'Disconnected';
    els.btDeviceInfo.classList.add('hidden');
    state.webBluetoothDevice = null;
    state.webBluetoothServer = null;
    state.webBluetoothTxChar = null;
    state.webBluetoothRxChar = null;
    showToast('Bluetooth device disconnected', 'info');
  }

  function disconnectWebBluetooth() {
    if (state.webBluetoothDevice && state.webBluetoothDevice.gatt.connected) {
      state.webBluetoothDevice.gatt.disconnect();
    }
  }

  // --- NETWORK INFO & QR CODE ---
  async function fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        
        // Primary QR
        if (data.primaryQr) {
          els.primaryQrImage.src = data.primaryQr;
          els.qrLoading.classList.add('hidden');
        }
        els.primaryNetworkUrl.textContent = data.primary.url;

        // Other IPs
        els.otherIpsList.innerHTML = '';
        data.wifiOrLan.forEach(item => {
          const div = document.createElement('div');
          div.className = 'ip-badge';
          div.innerHTML = `<span><strong>${item.type}</strong> (${item.name})</span> <span>${item.url}</span>`;
          els.otherIpsList.appendChild(div);
        });

        // Bluetooth PAN IPs
        els.btPanList.innerHTML = '';
        if (data.bluetooth && data.bluetooth.length > 0) {
          data.bluetooth.forEach(bt => {
            const div = document.createElement('div');
            div.className = 'ip-badge mt-2';
            div.innerHTML = `<span><strong>Bluetooth Adapter</strong> (${bt.name})</span> <span>${bt.url}</span>`;
            els.btPanList.appendChild(div);
          });
        } else {
          els.btPanList.innerHTML = `
            <div class="ip-badge mt-2" style="color: var(--text-muted)">
              No active Bluetooth Network Adapter detected yet. Pair your devices and enable Bluetooth Tethering in phone/PC settings to see direct Bluetooth IP.
            </div>
          `;
        }
      }
    } catch (e) {
      console.warn('Network info fetch error:', e);
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Mobile Drawer
    els.mobileMenuBtn.addEventListener('click', () => {
      els.sidebar.classList.toggle('open');
      els.sidebarOverlay.classList.toggle('active');
    });

    els.sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Theme
    els.themeToggleBtn.addEventListener('click', toggleTheme);

    // Mode Switcher Tabs
    els.tabLanMode.addEventListener('click', () => {
      state.activeMode = 'lan';
      els.tabLanMode.classList.add('active');
      els.tabBtMode.classList.remove('active');
      els.lanChannelsSection.classList.remove('hidden');
      els.btControlsSection.classList.add('hidden');
    });

    els.tabBtMode.addEventListener('click', () => {
      state.activeMode = 'bluetooth';
      els.tabBtMode.classList.add('active');
      els.tabLanMode.classList.remove('active');
      els.lanChannelsSection.classList.add('hidden');
      els.btControlsSection.classList.remove('hidden');
    });

    // Message Input & Typing
    els.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      } else {
        emitTyping(true);
        clearTimeout(state.typingTimeout);
        state.typingTimeout = setTimeout(() => emitTyping(false), 2000);
      }
    });

    els.messageInput.addEventListener('input', autoResizeInput);
    els.sendBtn.addEventListener('click', sendMessage);

    // Emoji Picker Toggle
    els.emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.emojiPicker.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!els.emojiPicker.contains(e.target) && e.target !== els.emojiBtn) {
        els.emojiPicker.classList.add('hidden');
      }
    });

    // File Attachment
    els.attachFileBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files));

    // Drag & Drop
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.dropOverlay.classList.remove('hidden');
    });

    els.dropOverlay.addEventListener('dragleave', () => {
      els.dropOverlay.classList.add('hidden');
    });

    els.dropOverlay.addEventListener('drop', (e) => {
      e.preventDefault();
      els.dropOverlay.classList.add('hidden');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    });

    // Clipboard Paste (e.g. screenshots)
    window.addEventListener('paste', (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleFileUpload(e.clipboardData.files);
      }
    });

    // Voice Recording
    els.recordVoiceBtn.addEventListener('click', startVoiceRecording);
    els.cancelVoiceBtn.addEventListener('click', () => stopVoiceRecording(false));
    els.sendVoiceBtn.addEventListener('click', () => stopVoiceRecording(true));

    // Web Bluetooth
    els.btScanBtn.addEventListener('click', scanWebBluetooth);
    els.btDisconnectBtn.addEventListener('click', disconnectWebBluetooth);
    els.openBtGuideBtn.addEventListener('click', () => {
      openConnectModal('bluetooth');
    });

    // Modals: QR / Connect
    els.openConnectModalBtn.addEventListener('click', () => openConnectModal('wifi'));
    els.headerQrBtn.addEventListener('click', () => openConnectModal('wifi'));
    els.closeConnectModal.addEventListener('click', () => els.connectModal.classList.add('hidden'));

    els.qrTabWifi.addEventListener('click', () => switchQrTab('wifi'));
    els.qrTabBluetooth.addEventListener('click', () => switchQrTab('bluetooth'));
    els.qrTabHelp.addEventListener('click', () => switchQrTab('help'));

    els.copyUrlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(els.primaryNetworkUrl.textContent).then(() => {
        showToast('Link copied to clipboard!', 'info');
      });
    });

    // Modals: Profile
    els.editUsernameBtn.addEventListener('click', openProfileModal);
    els.myAvatar.addEventListener('click', openProfileModal);
    els.closeProfileModal.addEventListener('click', () => els.profileModal.classList.add('hidden'));
    els.saveProfileBtn.addEventListener('click', saveProfile);

    // Modals: Create Room
    els.openCreateRoomBtn.addEventListener('click', () => els.createRoomModal.classList.remove('hidden'));
    els.closeCreateRoomModal.addEventListener('click', () => els.createRoomModal.classList.add('hidden'));
    els.confirmCreateRoomBtn.addEventListener('click', createRoom);

    // Modals: Lightbox
    els.closeLightboxBtn.addEventListener('click', () => els.lightboxModal.classList.add('hidden'));
    window.openLightbox = (url) => {
      els.lightboxImg.src = url;
      els.lightboxDownloadBtn.href = url;
      els.lightboxModal.classList.remove('hidden');
    };
  }

  function closeMobileSidebar() {
    els.sidebar.classList.remove('open');
    els.sidebarOverlay.classList.remove('active');
  }

  function autoResizeInput() {
    els.messageInput.style.height = 'auto';
    els.messageInput.style.height = Math.min(els.messageInput.scrollHeight, 120) + 'px';
  }

  function openConnectModal(tab) {
    els.connectModal.classList.remove('hidden');
    switchQrTab(tab);
    fetchNetworkInfo();
  }

  function switchQrTab(tab) {
    els.qrTabWifi.classList.toggle('active', tab === 'wifi');
    els.qrTabBluetooth.classList.toggle('active', tab === 'bluetooth');
    els.qrTabHelp.classList.toggle('active', tab === 'help');

    els.qrPanelWifi.classList.toggle('hidden', tab !== 'wifi');
    els.qrPanelBluetooth.classList.toggle('hidden', tab !== 'bluetooth');
    els.qrPanelHelp.classList.toggle('hidden', tab !== 'help');
  }

  function openProfileModal() {
    els.usernameInput.value = state.user.username;
    state.selectedTempColor = state.user.avatar;
    populateColorPalette();
    els.profileModal.classList.remove('hidden');
  }

  function saveProfile() {
    const newName = els.usernameInput.value.trim();
    if (newName) {
      state.user.username = newName;
      localStorage.setItem('oc_username', newName);
    }
    if (state.selectedTempColor) {
      state.user.avatar = state.selectedTempColor;
      localStorage.setItem('oc_avatar', state.selectedTempColor);
    }

    updateUserDisplay();
    els.profileModal.classList.add('hidden');

    if (socket && socket.connected) {
      socket.emit('user:join', {
        id: state.user.id,
        username: state.user.username,
        avatar: state.user.avatar,
        deviceType: state.user.deviceType,
        room: state.currentRoom
      });
    }
    showToast('Profile updated successfully', 'info');
  }

  function createRoom() {
    const name = els.newRoomName.value.trim();
    const desc = els.newRoomDesc.value.trim();
    if (!name) return;

    if (socket && socket.connected) {
      socket.emit('room:create', { name, description: desc });
      els.newRoomName.value = '';
      els.newRoomDesc.value = '';
      els.createRoomModal.classList.add('hidden');
      showToast(`Channel #${name} created!`, 'info');
    }
  }

  // --- SERVICE WORKER FOR OFFLINE PWA ---
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.log('Service Worker registration skipped or failed:', e);
      });
    }
  }

  // --- HELPERS ---
  function showToast(text, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    if (type === 'error') toast.style.borderLeftColor = 'var(--danger)';
    els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function linkify(text) {
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  // Kickstart app
  document.addEventListener('DOMContentLoaded', init);
})();
