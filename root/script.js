// ==========================================================================
// ZeptaLabs News & Updates - Standalone Client Script
// Account Key Authentication & Profile Dropdown Integration
// Theme: Grey, Black, White | Zero Emojis | Zero Gradients
// ==========================================================================

const EMAILJS_CONFIG = {
  serviceId: 'service_wotox2121',
  templateId: 'template_2f2zlo1',
  publicKey: '3KhMYEXg6XYbAUOyW',
};

// Cryptographic SHA-256 function for secure key verification
function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const maxWord = 4294967296;
  const words = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let str = ascii + '\x80';
  while ((str.length % 64) !== 56) str += '\x00';
  for (let i = 0; i < str.length; i++) {
    words[i >> 2] |= str.charCodeAt(i) << (((3 - i) % 4) * 8);
  }
  words[words.length] = Math.floor(asciiBitLength / maxWord);
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = [...hash];

    for (let i = 0; i < 64; i++) {
      let w15 = w[i - 15] || 0, w2 = w[i - 2] || 0;
      let s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      let s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      let ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      let maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      let temp1 =
        hash[7] +
        (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
        ch +
        k[i] +
        (w[i] = (i < 16 ? (w[i] || 0) : ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0));
      let temp2 =
        (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Irreversible cryptographic SHA-256 digests of authorized admin keys (Zero raw key exposure)
const AUTHORIZED_ADMIN_HASHES = [
  '5175bf3cc64f2faa88ab54c08694aa81c0dfdb8fb441271ee970d26f98fd779c',
  '1931a8de33c52fd980828a9bb3a9683491f9c041d7f912b33c1cebbce7b98383',
  'dd9c50fe578af7964d8c930663a56bbf4dc34c0193e09d4a5e74ac1644e4540e',
];

function verifyAdminKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const rawWithoutHash = trimmed.replace(/^#+/, '');
  const h1 = sha256Sync(trimmed);
  const h2 = sha256Sync(normalized);
  const h3 = sha256Sync(rawWithoutHash);
  return AUTHORIZED_ADMIN_HASHES.some((h) => h === h1 || h === h2 || h === h3);
}

// State
let currentUser = null;
let posts = [];
let pendingSignup = null;
let activeSharePost = null;
let currentPostFile = null;
let pickedCategory = null;
let isKeyVisible = false;
let isDropdownOpen = false;

// Client session ID for unique likes
function getClientId() {
  let id = localStorage.getItem('zeptalabs_client_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('zeptalabs_client_id', id);
  }
  return id;
}

// Generate unique Account Key (# + 22 characters)
function generateAccountKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 22; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `#${randomStr}`;
}

let knownPostIds = new Set();
let isFirstLoad = true;

// Trigger Chrome / Google browser push notification
function triggerBrowserNotification(title, body, url) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (currentUser && currentUser.notificationsEnabled === false) return;

  try {
    const notif = new Notification(title, {
      body: body,
      icon: 'logo.png',
      badge: 'logo.png',
      tag: 'zeptalabs-update',
      renotify: true,
    });
    notif.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      notif.close();
    };
  } catch (err) {
    console.warn('Browser notification note:', err);
  }
}

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
  // Set copyright year
  const yr = document.getElementById('currentYear');
  if (yr) yr.textContent = new Date().getFullYear();

  // Initialize EmailJS
  if (window.emailjs) {
    emailjs.init(EMAILJS_CONFIG.publicKey);
  }

  // Register service worker if supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }

  // Restore stored session
  try {
    const saved = localStorage.getItem('zeptalabs_current_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      if (currentUser && !currentUser.accountKey) {
        currentUser.accountKey = generateAccountKey();
        localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
      }
      if (currentUser && currentUser.notificationsEnabled !== false && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    }
  } catch {}

  renderNavActions();
  bindEvents();
  loadPosts();

  // Real-time polling every 3.5 seconds
  setInterval(loadPosts, 3500);

  // Deep linking to specific post
  handleDeepLink();
});

// Deep linking (?post=... or #...)
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('post') || window.location.hash.replace('#', '');
  if (postId) {
    setTimeout(() => {
      const el = document.getElementById(postId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('target-post-highlight');
        setTimeout(() => el.classList.remove('target-post-highlight'), 3500);
      }
    }, 500);
  }
}

// Render Navbar Actions (Profile button with Dropdown menu or Login/Signup)
function renderNavActions() {
  const container = document.getElementById('navActions');
  if (!container) return;

  if (currentUser) {
    if (!currentUser.accountKey || currentUser.accountKey.trim() === '') {
      currentUser.accountKey = generateAccountKey();
      try {
        localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
      } catch (e) {}
    }

    const resolvedKey = currentUser.accountKey || '';
    const isNotificationsActive = currentUser.notificationsEnabled !== false;
    const maskedKey = '••••••••••••••••••••••••';
    const displayKey = isKeyVisible ? resolvedKey : maskedKey;

    container.innerHTML = `
      ${currentUser.isAdmin ? `
        <button id="btnOpenSharePost" class="btn-black btn-sm" style="display: inline-flex;">
          + Share An Update/News
        </button>
      ` : ''}

      <!-- Profile Badge Trigger Button -->
      <div style="position: relative;" id="profileDropdownContainer">
        <button type="button" id="btnToggleProfileMenu" class="user-profile-btn" aria-label="User profile menu">
          <div class="user-profile-avatar">
            <img src="${currentUser.avatarUrl || 'logo.png'}" alt="Avatar" onerror="this.onerror=null; this.src='logo.png';">
          </div>
          <span class="user-profile-name">${escapeHtml(currentUser.name)}</span>
          ${currentUser.isAdmin ? '<span class="official-tag">Official</span>' : ''}
          <span style="font-size: 0.65rem; color: #737373; margin-left: 2px;">&#9662;</span>
        </button>

        <!-- Profile Dropdown Menu (4 Options) -->
        <div id="profileDropdownMenu" class="profile-dropdown-menu ${isDropdownOpen ? 'active' : ''}">
          <!-- Header -->
          <div class="dropdown-user-header">
            <div class="dropdown-user-avatar">
              <img src="${currentUser.avatarUrl || 'logo.png'}" alt="Avatar" onerror="this.onerror=null; this.src='logo.png';">
            </div>
            <div style="overflow: hidden;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="font-size: 0.85rem; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
                  ${escapeHtml(currentUser.name)}
                </strong>
                ${currentUser.isAdmin ? '<span class="official-tag">Official</span>' : ''}
              </div>
              <span style="font-size: 0.7rem; color: #737373; font-family: monospace;">Active Session</span>
            </div>
          </div>

          <!-- OPTION 1: Notify me for news&updates -->
          <div class="dropdown-option-row">
            <div>
              <div style="font-weight: 600; color: #000;">Notify me for news&amp;updates</div>
              <div style="font-size: 0.7rem; color: #737373;" id="notifyStatusLabel">
                ${isNotificationsActive ? 'Active' : 'Muted'}
              </div>
            </div>
            <button type="button" id="btnToggleNotifications" class="toggle-switch-btn ${isNotificationsActive ? 'active' : ''}" aria-label="Toggle notifications">
              <span class="toggle-switch-handle"></span>
            </button>
          </div>

          <!-- OPTION 2: Account key with hide/unhide and copy button -->
          <div style="background-color: #fafafa; border: 1px solid #e5e5e5; padding: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #404040;">Account key</span>
              <button type="button" id="btnToggleKeyVisibility" style="background: none; border: none; font-size: 0.75rem; font-weight: 600; color: #000; cursor: pointer; text-decoration: underline;">
                ${isKeyVisible ? 'Hide' : 'Unhide'}
              </button>
            </div>
            <div class="key-box-display">
              <span class="key-text-content" id="displayedAccountKey">${escapeHtml(displayKey)}</span>
              <button type="button" id="btnCopyProfileKey" class="btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem;">Copy</button>
            </div>
          </div>

          <!-- OPTION 3: Switch account -->
          <button type="button" id="btnSwitchAccount" class="btn-outline" style="width: 100%; justify-content: flex-start; font-size: 0.8rem; padding: 8px 12px;">
            &#8644; <span style="margin-left: 6px;">Switch account</span>
          </button>

          <!-- OPTION 4: Logout -->
          <div style="border-top: 1px solid #e5e5e5; padding-top: 10px;">
            <button type="button" id="btnLogout" class="btn-outline" style="width: 100%; justify-content: flex-start; font-size: 0.8rem; padding: 8px 12px; color: #000; border-color: #000;">
              &#10005; <span style="margin-left: 6px;">Logout</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind dropdown events
    const btnToggle = document.getElementById('btnToggleProfileMenu');
    if (btnToggle) {
      btnToggle.onclick = (e) => {
        e.stopPropagation();
        isDropdownOpen = !isDropdownOpen;
        const menu = document.getElementById('profileDropdownMenu');
        if (menu) menu.classList.toggle('active', isDropdownOpen);
      };
    }

    // Toggle Notifications
    const btnNotify = document.getElementById('btnToggleNotifications');
    if (btnNotify) {
      btnNotify.onclick = (e) => {
        e.stopPropagation();
        const nextState = !(currentUser.notificationsEnabled !== false);
        currentUser.notificationsEnabled = nextState;
        localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
        renderNavActions();

        if (nextState && 'Notification' in window) {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              triggerBrowserNotification(
                'ZeptaLabs Notifications Active',
                'You will receive real-time push alerts from Chrome whenever admin uploads a news or update.'
              );
            }
          });
        }
      };
    }

    // Hide / Unhide Key
    const btnKeyVis = document.getElementById('btnToggleKeyVisibility');
    if (btnKeyVis) {
      btnKeyVis.onclick = (e) => {
        e.stopPropagation();
        isKeyVisible = !isKeyVisible;
        const resolvedKey = (currentUser && currentUser.accountKey) || '';
        const keyEl = document.getElementById('displayedAccountKey');
        if (keyEl) keyEl.textContent = isKeyVisible ? (resolvedKey || 'Key Unavailable') : maskedKey;
        btnKeyVis.textContent = isKeyVisible ? 'Hide' : 'Unhide';
      };
    }

    // Copy Account Key
    const btnCopy = document.getElementById('btnCopyProfileKey');
    if (btnCopy) {
      btnCopy.onclick = (e) => {
        e.stopPropagation();
        const resolvedKey = (currentUser && currentUser.accountKey) || '';
        if (resolvedKey) {
          navigator.clipboard.writeText(resolvedKey);
          btnCopy.textContent = 'Copied!';
          setTimeout(() => {
            btnCopy.textContent = 'Copy';
          }, 2000);
        }
      };
    }

    // Switch Account
    const btnSwitch = document.getElementById('btnSwitchAccount');
    if (btnSwitch) {
      btnSwitch.onclick = (e) => {
        e.stopPropagation();
        isDropdownOpen = false;
        openAuthModal('login', 'Enter your Account Key to switch accounts:');
      };
    }

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.onclick = () => {
        currentUser = null;
        isDropdownOpen = false;
        localStorage.removeItem('zeptalabs_current_user');
        renderNavActions();
      };
    }

    // Share Modal Open
    const btnShare = document.getElementById('btnOpenSharePost');
    if (btnShare) {
      btnShare.onclick = () => openSharePostModal();
    }
  } else {
    container.innerHTML = `<button id="btnOpenLogin" class="btn-black">Login / Signup</button>`;
    const btnLogin = document.getElementById('btnOpenLogin');
    if (btnLogin) {
      btnLogin.onclick = () => openAuthModal('login');
    }
  }
}

// Global click outside to close dropdown
document.addEventListener('click', (e) => {
  const container = document.getElementById('profileDropdownContainer');
  if (container && !container.contains(e.target)) {
    if (isDropdownOpen) {
      isDropdownOpen = false;
      const menu = document.getElementById('profileDropdownMenu');
      if (menu) menu.classList.remove('active');
    }
  }
});

// Bind UI events
function bindEvents() {
  // Auth Modal Buttons
  document.getElementById('btnCloseAuth')?.addEventListener('click', closeAuthModal);
  document.getElementById('tabBtnLogin')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tabBtnSignup')?.addEventListener('click', () => switchAuthTab('signup'));

  // Auth Forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
  document.getElementById('signupForm')?.addEventListener('submit', handleSignupSubmit);
  document.getElementById('otpForm')?.addEventListener('submit', handleOtpSubmit);
  document.getElementById('btnResendOtp')?.addEventListener('click', handleResendOtp);
  document.getElementById('btnChangeEmailOtp')?.addEventListener('click', () => switchAuthTab('signup'));

  // Avatar Picker & Profile Setup
  document.getElementById('btnChooseAvatar')?.addEventListener('click', () => {
    document.getElementById('avatarFileInput')?.click();
  });
  document.getElementById('avatarFileInput')?.addEventListener('change', handleAvatarFileChange);
  document.getElementById('profileSetupForm')?.addEventListener('submit', handleProfileSetupSubmit);
  document.getElementById('btnGenerateAccountKey')?.addEventListener('click', handleProfileSetupSubmit);

  // Key Reveal Actions
  document.getElementById('btnCopyRevealedKey')?.addEventListener('click', () => {
    const key = document.getElementById('revealedAccountKey')?.textContent || '';
    if (key) {
      navigator.clipboard.writeText(key);
      const btn = document.getElementById('btnCopyRevealedKey');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy Key'), 2000);
      }
    }
  });

  document.getElementById('btnProceedRevealedKey')?.addEventListener('click', () => {
    if (pendingSignup?.generatedKey) {
      // Auto log in with generated account
      currentUser = {
        name: pendingSignup.name,
        email: pendingSignup.email,
        avatarUrl: pendingSignup.avatarUrl || 'logo.png',
        accountKey: pendingSignup.generatedKey,
        isAdmin: false,
        notificationsEnabled: true,
      };
      localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
      pendingSignup = null;
      renderNavActions();
      closeAuthModal();
    } else {
      switchAuthTab('login');
    }
  });

  // Admin Share Post Modal
  document.getElementById('btnCloseSharePostModal')?.addEventListener('click', closeSharePostModal);
  document.getElementById('btnPickNews')?.addEventListener('click', () => pickCategory('News'));
  document.getElementById('btnPickUpdate')?.addEventListener('click', () => pickCategory('Update'));
  document.getElementById('btnBackToPickCategory')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('shareCategoryPicker').style.display = 'block';
    document.getElementById('createPostForm').style.display = 'none';
  });
  document.getElementById('btnSelectPostFile')?.addEventListener('click', () => {
    document.getElementById('postFileInput')?.click();
  });
  document.getElementById('postFileInput')?.addEventListener('change', handlePostFileChange);
  document.getElementById('btnRemovePostFile')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentPostFile = null;
    document.getElementById('postFileInput').value = '';
    document.getElementById('postFilePreview').style.display = 'none';
  });
  document.getElementById('createPostForm')?.addEventListener('submit', handleCreatePostSubmit);

  // Share Dialog
  document.getElementById('btnCloseShareDialog')?.addEventListener('click', closeShareDialog);
  document.getElementById('btnCopyShareUrl')?.addEventListener('click', handleCopyShareLink);
  document.querySelectorAll('.share-item-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const platform = e.currentTarget.getAttribute('data-platform');
      handlePlatformShare(platform);
    });
  });
}

// Load Posts from Server API or Local Storage
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    if (res.ok) {
      const serverPosts = await res.json();

      // Check if new post was uploaded by Admin
      if (!isFirstLoad && serverPosts.length > 0) {
        const newPosts = serverPosts.filter((p) => !knownPostIds.has(p.id));
        if (newPosts.length > 0) {
          for (const np of newPosts) {
            knownPostIds.add(np.id);
            triggerBrowserNotification(
              `ZeptaLabs ${np.category}: ${np.title}`,
              np.description && np.description.trim()
                ? np.description.slice(0, 120) + (np.description.length > 120 ? '...' : '')
                : `New ${np.category.toLowerCase()} posted by ZeptaLabs Officials. Click to view.`,
              `/?post=${np.id}#${np.id}`
            );
          }
        }
      }

      serverPosts.forEach((p) => knownPostIds.add(p.id));
      isFirstLoad = false;
      posts = serverPosts;

      // Sync any local offline posts that server doesn't have yet
      try {
        const localRaw = localStorage.getItem('zeptalabs_posts');
        if (localRaw) {
          const localPosts = JSON.parse(localRaw);
          const serverIdSet = new Set(serverPosts.map((p) => p.id));
          const unsynced = (localPosts || []).filter((p) => !serverIdSet.has(p.id));
          if (unsynced.length > 0) {
            fetch('/api/posts/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ posts: unsynced }),
            }).catch(() => {});
          }
        }
      } catch {}

      renderFeed();
      return;
    }
  } catch {}

  // Fallback local storage
  try {
    const raw = localStorage.getItem('zeptalabs_posts');
    posts = raw ? JSON.parse(raw) : [];
  } catch {}
  renderFeed();
}

// Render Feed Items
function renderFeed() {
  const newsPosts = posts.filter((p) => p.category === 'News');
  const updatePosts = posts.filter((p) => p.category === 'Update');

  const newsFeed = document.getElementById('newsFeed');
  const updatesFeed = document.getElementById('updatesFeed');
  const newsBadge = document.getElementById('newsCountBadge');
  const updatesBadge = document.getElementById('updatesCountBadge');

  // News section
  if (newsBadge) {
    if (newsPosts.length > 0) {
      newsBadge.style.display = 'inline-block';
      newsBadge.textContent = `${newsPosts.length} Posts`;
    } else {
      newsBadge.style.display = 'none';
    }
  }

  if (newsFeed) {
    if (newsPosts.length === 0) {
      newsFeed.innerHTML = `
        <div class="empty-state">
          <div class="ghost-clock"></div>
          <h3 class="empty-title">Nothing New</h3>
          <p class="empty-desc">Stay tuned for upcoming news.</p>
        </div>
      `;
    } else {
      newsFeed.innerHTML = newsPosts.map((p) => renderPostCardHtml(p)).join('');
    }
  }

  // Updates section
  if (updatesBadge) {
    if (updatePosts.length > 0) {
      updatesBadge.style.display = 'inline-block';
      updatesBadge.textContent = `${updatePosts.length} Posts`;
    } else {
      updatesBadge.style.display = 'none';
    }
  }

  if (updatesFeed) {
    if (updatePosts.length === 0) {
      updatesFeed.innerHTML = `
        <div class="empty-state">
          <div class="ghost-clock"></div>
          <h3 class="empty-title">No updates yet</h3>
          <p class="empty-desc">New updates will be posted here soon.</p>
        </div>
      `;
    } else {
      updatesFeed.innerHTML = updatePosts.map((p) => renderPostCardHtml(p)).join('');
    }
  }

  bindPostCardActions();
}

// Generate Post Card HTML
function renderPostCardHtml(post) {
  const clientId = getClientId();
  const isLiked = (post.likedBy || []).includes(clientId);
  const commentsCount = (post.comments || []).length;

  let attachmentHtml = '';
  if (post.attachment) {
    if (post.attachment.type === 'image') {
      attachmentHtml = `<div class="post-attachment"><img src="${post.attachment.dataUrl}" alt="${post.attachment.name}"></div>`;
    } else if (post.attachment.type === 'video') {
      attachmentHtml = `<div class="post-attachment"><video src="${post.attachment.dataUrl}" controls></video></div>`;
    } else {
      attachmentHtml = `
        <div class="post-attachment">
          <div class="file-download-box">
            <div class="file-download-info">
              <div class="file-icon-box">${post.attachment.type === 'apk' ? 'APK' : 'FILE'}</div>
              <div>
                <div class="file-name">${post.attachment.name}</div>
                <div class="file-meta">${post.attachment.sizeFormatted} • Attachment</div>
              </div>
            </div>
            <a href="${post.attachment.dataUrl}" download="${post.attachment.name}" class="btn-black btn-sm">Download</a>
          </div>
        </div>
      `;
    }
  }

  return `
    <article id="${post.id}" class="post-card">
      <div class="post-card-header">
        <div class="post-author-wrap">
          <div class="post-author-avatar">
            <img src="${post.authorAvatar || 'logo.png'}" alt="Author" onerror="this.onerror=null; this.src='logo.png';">
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="post-author-name">${post.authorName}</span>
              <span class="official-tag">Official</span>
            </div>
            <span class="post-date">${post.createdAt}</span>
          </div>
        </div>
        <span class="post-category-tag">${post.category}</span>
      </div>

      <h3 class="post-title">${escapeHtml(post.title)}</h3>
      ${post.description ? `<div class="post-description">${escapeHtml(post.description)}</div>` : ''}
      ${attachmentHtml}

      <div class="post-action-bar">
        <div style="display: flex; gap: 16px;">
          <button class="action-btn btn-like-post ${isLiked ? 'active' : ''}" data-post-id="${post.id}">
            &hearts; <span>${post.likes || 0} Likes</span>
          </button>
          <button class="action-btn btn-toggle-comments" data-post-id="${post.id}">
            &#9998; <span>${commentsCount} Comments</span>
          </button>
        </div>

        <button class="action-btn btn-open-share" data-post-id="${post.id}">
          &#10150; <span>${post.shares || 0} Shares</span>
        </button>
      </div>

      <!-- Comments Thread -->
      <div id="comments_wrap_${post.id}" class="comments-wrap" style="display: none;">
        <form class="comment-input-form" data-post-id="${post.id}">
          ${!currentUser ? `<input type="text" class="input-text comment-author-input" placeholder="Your Name (Optional)" style="margin-bottom: 4px;">` : ''}
          <div class="comment-row">
            <input type="text" required class="input-text comment-text-input" placeholder="Write a comment...">
            <button type="submit" class="btn-black btn-sm">Post</button>
          </div>
        </form>

        <div class="comments-list">
          ${(post.comments || []).length === 0 ? '<p style="color: #a3a3a3; font-size: 0.75rem; font-style: italic;">No comments yet.</p>' : ''}
          ${(post.comments || []).map((c) => {
            const isCommentLiked = (c.likedBy || []).includes(clientId);
            return `
              <div class="comment-item">
                <div class="comment-header">
                  <span class="comment-author">${escapeHtml(c.authorName)} ${c.authorName === 'ZeptaLabs Officials' ? '<span class="official-tag">Official</span>' : ''}</span>
                  <span class="comment-date">${c.createdAt}</span>
                </div>
                <div class="comment-body">${escapeHtml(c.content)}</div>
                <div class="comment-footer">
                  <button class="action-btn btn-like-comment ${isCommentLiked ? 'active' : ''}" data-post-id="${post.id}" data-comment-id="${c.id}">
                    &hearts; <span>${c.likes || 0} Likes</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </article>
  `;
}

// Bind Action Listeners on Post Cards
function bindPostCardActions() {
  // Likes
  document.querySelectorAll('.btn-like-post').forEach((btn) => {
    btn.onclick = async (e) => {
      const postId = e.currentTarget.getAttribute('data-post-id');
      await toggleLike(postId);
    };
  });

  // Toggle Comments
  document.querySelectorAll('.btn-toggle-comments').forEach((btn) => {
    btn.onclick = (e) => {
      const postId = e.currentTarget.getAttribute('data-post-id');
      const wrap = document.getElementById(`comments_wrap_${postId}`);
      if (wrap) {
        wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
      }
    };
  });

  // Submit Comment
  document.querySelectorAll('.comment-input-form').forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const postId = e.currentTarget.getAttribute('data-post-id');
      const textInput = e.currentTarget.querySelector('.comment-text-input');
      const authorInput = e.currentTarget.querySelector('.comment-author-input');

      const content = textInput?.value || '';
      const author = currentUser ? currentUser.name : (authorInput?.value || 'Visitor');

      if (!content.trim()) return;

      await submitComment(postId, author, content);
      textInput.value = '';
    };
  });

  // Comment Likes
  document.querySelectorAll('.btn-like-comment').forEach((btn) => {
    btn.onclick = async (e) => {
      const postId = e.currentTarget.getAttribute('data-post-id');
      const commentId = e.currentTarget.getAttribute('data-comment-id');
      await toggleCommentLike(postId, commentId);
    };
  });

  // Share Dialog
  document.querySelectorAll('.btn-open-share').forEach((btn) => {
    btn.onclick = (e) => {
      const postId = e.currentTarget.getAttribute('data-post-id');
      const p = posts.find((item) => item.id === postId);
      if (p) openShareDialog(p);
    };
  });
}

// API Post Like
async function toggleLike(postId) {
  const clientId = getClientId();
  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    if (res.ok) {
      loadPosts();
      return;
    }
  } catch {}

  // Fallback local
  posts = posts.map((p) => {
    if (p.id === postId) {
      const already = (p.likedBy || []).includes(clientId);
      const newLikedBy = already ? p.likedBy.filter((c) => c !== clientId) : [...(p.likedBy || []), clientId];
      return { ...p, likes: newLikedBy.length, likedBy: newLikedBy };
    }
    return p;
  });
  localStorage.setItem('zeptalabs_posts', JSON.stringify(posts));
  renderFeed();
}

// API Submit Comment
async function submitComment(postId, authorName, content) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, content }),
    });
    if (res.ok) {
      loadPosts();
      return;
    }
  } catch {}

  // Local fallback
  const comment = {
    id: 'comment_' + Date.now(),
    authorName,
    content,
    createdAt: 'Just now',
    likes: 0,
    likedBy: [],
  };
  posts = posts.map((p) => {
    if (p.id === postId) {
      return { ...p, comments: [...(p.comments || []), comment] };
    }
    return p;
  });
  localStorage.setItem('zeptalabs_posts', JSON.stringify(posts));
  renderFeed();
}

// API Comment Like
async function toggleCommentLike(postId, commentId) {
  const clientId = getClientId();
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    if (res.ok) {
      loadPosts();
      return;
    }
  } catch {}

  // Local fallback
  posts = posts.map((p) => {
    if (p.id === postId) {
      const updated = (p.comments || []).map((c) => {
        if (c.id === commentId) {
          const already = (c.likedBy || []).includes(clientId);
          const newLikedBy = already ? c.likedBy.filter((x) => x !== clientId) : [...(c.likedBy || []), clientId];
          return { ...c, likes: newLikedBy.length, likedBy: newLikedBy };
        }
        return c;
      });
      return { ...p, comments: updated };
    }
    return p;
  });
  localStorage.setItem('zeptalabs_posts', JSON.stringify(posts));
  renderFeed();
}

// Open Share Dialog
function openShareDialog(post) {
  activeSharePost = post;
  const shareUrl = `${window.location.origin}/?post=${post.id}#${post.id}`;

  document.getElementById('shareDialogCategory').textContent = post.category;
  document.getElementById('shareDialogTitle').textContent = post.title;
  document.getElementById('shareUrlInput').value = shareUrl;

  const btnNative = document.getElementById('btnNativeShare');
  if (btnNative && navigator.share) {
    btnNative.style.display = 'block';
    btnNative.onclick = () => {
      navigator.share({
        title: post.title,
        text: post.description || post.title,
        url: shareUrl,
      });
      trackShare(post.id);
    };
  } else if (btnNative) {
    btnNative.style.display = 'none';
  }

  document.getElementById('shareDialogModal').classList.add('active');
}

function closeShareDialog() {
  document.getElementById('shareDialogModal').classList.remove('active');
  activeSharePost = null;
}

async function trackShare(postId) {
  try {
    await fetch(`/api/posts/${postId}/share`, { method: 'POST' });
  } catch {}
  loadPosts();
}

function handleCopyShareLink() {
  const input = document.getElementById('shareUrlInput');
  if (!input || !activeSharePost) return;
  navigator.clipboard.writeText(input.value);
  document.getElementById('btnCopyShareUrl').textContent = 'Copied!';
  trackShare(activeSharePost.id);
  setTimeout(() => {
    document.getElementById('btnCopyShareUrl').textContent = 'Copy';
  }, 2000);
}

function handlePlatformShare(platform) {
  if (!activeSharePost) return;
  const shareUrl = `${window.location.origin}/?post=${activeSharePost.id}#${activeSharePost.id}`;
  const text = `ZeptaLabs ${activeSharePost.category}: ${activeSharePost.title}`;

  let targetUrl = '';
  if (platform === 'whatsapp') targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
  else if (platform === 'twitter') targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  else if (platform === 'telegram') targetUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  else if (platform === 'facebook') targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  else if (platform === 'linkedin') targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  else if (platform === 'reddit') targetUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`;
  else if (platform === 'email') targetUrl = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`;

  if (targetUrl) {
    trackShare(activeSharePost.id);
    window.open(targetUrl, '_blank');
  }
}

// ==========================================================================
// AUTHENTICATION MODAL FUNCTIONS (ACCOUNT KEY SYSTEM)
// ==========================================================================

function openAuthModal(mode = 'login', noticeMsg = '') {
  document.getElementById('authModal').classList.add('active');
  switchAuthTab(mode);
  if (noticeMsg) {
    setAuthNotice(noticeMsg);
  }
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
  setAuthNotice('');
}

function switchAuthTab(mode) {
  setAuthNotice('');
  document.getElementById('authTabSwitcher').style.display = 'flex';
  document.getElementById('otpForm').style.display = 'none';
  document.getElementById('profileSetupForm').style.display = 'none';
  document.getElementById('keyRevealView').style.display = 'none';

  if (mode === 'login') {
    document.getElementById('tabBtnLogin').classList.add('active');
    document.getElementById('tabBtnSignup').classList.remove('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('authModalTitle').textContent = 'Account Access';
  } else {
    document.getElementById('tabBtnLogin').classList.remove('active');
    document.getElementById('tabBtnSignup').classList.add('active');
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('authModalTitle').textContent = 'Create Account';
  }
}

function setAuthNotice(msg, isSuccess = false) {
  const el = document.getElementById('authNotice');
  if (!el) return;
  if (!msg) {
    el.style.display = 'none';
    el.textContent = '';
  } else {
    el.style.display = 'block';
    el.style.color = '#000000';
    el.style.background = isSuccess ? '#f5f5f5' : '#fafafa';
    el.style.borderColor = '#000000';
    el.textContent = msg;
  }
}

// Handle Login (ONLY with Account Key)
function handleLoginSubmit(e) {
  e.preventDefault();
  const rawKey = document.getElementById('loginAccountKey').value.trim();
  if (!rawKey) {
    setAuthNotice('Please enter your Account Key.');
    return;
  }
  const normalizedKey = rawKey.startsWith('#') ? rawKey : `#${rawKey}`;
  const rawWithoutHash = rawKey.replace(/^#+/, '').toLowerCase();

  // Check Official Admin Master Account Key using cryptographic SHA-256
  const isAdmin = verifyAdminKey(rawKey);

  if (isAdmin) {
    currentUser = {
      name: 'ZeptaLabs Officials',
      email: 'zeptalabs.com@gmail.com',
      avatarUrl: 'logo.png',
      accountKey: normalizedKey,
      isAdmin: true,
      notificationsEnabled: true,
    };
    localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
    renderNavActions();
    closeAuthModal();
    return;
  }

  // Check stored registered users with null-safe access
  try {
    const raw = localStorage.getItem('zeptalabs_users');
    const users = raw ? JSON.parse(raw) : [];
    const found = users.find((u) => {
      const uKey = (u?.accountKey || '').trim().toLowerCase();
      if (!uKey) return false;
      return (
        uKey === rawKey.toLowerCase() ||
        uKey === normalizedKey.toLowerCase() ||
        uKey.replace(/^#+/, '') === rawWithoutHash
      );
    });

    if (found) {
      currentUser = {
        name: found.name,
        email: found.email,
        avatarUrl: found.avatarUrl || 'logo.png',
        accountKey: found.accountKey,
        isAdmin: false,
        notificationsEnabled: found.notificationsEnabled !== false,
      };
      localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
      renderNavActions();
      closeAuthModal();
      return;
    }
  } catch (err) {
    console.warn('Login lookup notice:', err);
  }

  setAuthNotice('Invalid Account Key. Keys start with #. Check your key or create a new account.');
}

// Handle Signup with EmailJS OTP
async function handleSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();

  if (!name || !email) {
    setAuthNotice('Please fill in your name and email.');
    return;
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  pendingSignup = { name, email, otpCode };

  const submitBtn = document.getElementById('btnSubmitSignup');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending Passcode...';

  try {
    if (window.emailjs) {
      const now = new Date();
      const timeFormatted = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        email: email,
        name: name,
        passcode: otpCode,
        time: timeFormatted,
        to_email: email,
        to_name: name,
        reply_to: email,
        user_email: email,
        user_name: name,
        code: otpCode,
        otp: otpCode,
      });
    }
  } catch (err) {
    console.warn('EmailJS notice:', err);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Send Verification Code';

  // Show OTP verification form
  document.getElementById('authTabSwitcher').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('otpForm').style.display = 'block';
  document.getElementById('otpEmailTarget').textContent = email;
  document.getElementById('authModalTitle').textContent = 'Verify Email';
  setAuthNotice(`Passcode dispatched to ${email}`, true);
}

function handleResendOtp(e) {
  if (e) e.preventDefault();
  if (!pendingSignup) return;
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  pendingSignup.otpCode = newOtp;

  if (window.emailjs) {
    const now = new Date();
    const timeFormatted = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      email: pendingSignup.email,
      name: pendingSignup.name,
      passcode: newOtp,
      time: timeFormatted,
      to_email: pendingSignup.email,
      to_name: pendingSignup.name,
      reply_to: pendingSignup.email,
      user_email: pendingSignup.email,
      user_name: pendingSignup.name,
      code: newOtp,
      otp: newOtp,
    });
  }
  setAuthNotice(`New passcode transmitted to ${pendingSignup.email}`, true);
}

// Handle OTP verification
function handleOtpSubmit(e) {
  e.preventDefault();
  const entered = document.getElementById('otpCodeInput').value.trim();
  if (pendingSignup && entered === pendingSignup.otpCode) {
    // Show Profile Setup
    document.getElementById('otpForm').style.display = 'none';
    document.getElementById('profileSetupForm').style.display = 'block';
    document.getElementById('profileDisplayName').value = pendingSignup.name;
    document.getElementById('authModalTitle').textContent = 'Profile Setup';
    setAuthNotice('');
  } else {
    setAuthNotice('Incorrect 6-digit code. Please enter the code sent to your email.');
  }
}

// Profile picture upload
function handleAvatarFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const rawResult = reader.result;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          document.getElementById('avatarPreviewImg').src = compressed;
          if (!pendingSignup) pendingSignup = {};
          pendingSignup.avatarUrl = compressed;
        } else {
          document.getElementById('avatarPreviewImg').src = rawResult;
          if (!pendingSignup) pendingSignup = {};
          pendingSignup.avatarUrl = rawResult;
        }
      } catch {
        document.getElementById('avatarPreviewImg').src = rawResult;
        if (!pendingSignup) pendingSignup = {};
        pendingSignup.avatarUrl = rawResult;
      }
    };
    img.onerror = () => {
      document.getElementById('avatarPreviewImg').src = rawResult;
      if (!pendingSignup) pendingSignup = {};
      pendingSignup.avatarUrl = rawResult;
    };
    img.src = rawResult;
  };
  reader.readAsDataURL(file);
}

// Profile setup completion -> Generate unique Account Key -> Key Reveal view
function handleProfileSetupSubmit(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  if (!pendingSignup) {
    pendingSignup = {
      name: 'ZeptaLabs Member',
      email: 'member@zeptalabs.com',
    };
  }

  const nameInput = document.getElementById('profileDisplayName');
  const name =
    (nameInput && nameInput.value.trim()) ||
    pendingSignup.name ||
    'ZeptaLabs Member';
  const avatar = pendingSignup.avatarUrl || 'logo.png';
  const newKey = generateAccountKey();

  const newUser = {
    name,
    email: pendingSignup.email || 'member@zeptalabs.com',
    avatarUrl: avatar,
    accountKey: newKey,
    notificationsEnabled: true,
    createdAt: new Date().toISOString(),
  };

  // Save to stored users with error handling
  try {
    const raw = localStorage.getItem('zeptalabs_users');
    const users = raw ? JSON.parse(raw) : [];
    const targetKey = newKey.toLowerCase();
    const filtered = users.filter((u) => {
      const uKey = (u?.accountKey || '').trim().toLowerCase();
      return uKey !== '' && uKey !== targetKey;
    });
    filtered.push(newUser);
    try {
      localStorage.setItem('zeptalabs_users', JSON.stringify(filtered));
    } catch {
      // Fallback if avatar is too large
      const trimmed = filtered.map((u) =>
        (u?.accountKey || '').toLowerCase() === targetKey ? { ...newUser, avatarUrl: 'logo.png' } : u
      );
      try {
        localStorage.setItem('zeptalabs_users', JSON.stringify(trimmed));
      } catch {}
    }
  } catch (err) {
    console.error('Storage save notice:', err);
  }

  pendingSignup.generatedKey = newKey;
  pendingSignup.name = name;
  pendingSignup.avatarUrl = avatar;

  // Show Key Reveal view
  const profileForm = document.getElementById('profileSetupForm');
  const keyReveal = document.getElementById('keyRevealView');
  const keyText = document.getElementById('revealedAccountKey');
  const modalTitle = document.getElementById('authModalTitle');

  if (profileForm) profileForm.style.display = 'none';
  if (keyReveal) keyReveal.style.display = 'block';
  if (keyText) keyText.textContent = newKey;
  if (modalTitle) modalTitle.textContent = 'Account Key Created';
  setAuthNotice('Account key successfully generated. Copy and save your key.', true);
}

// ==========================================================================
// ADMIN SHARE AN UPDATE / NEWS MODAL
// ==========================================================================

function openSharePostModal() {
  pickedCategory = null;
  currentPostFile = null;
  document.getElementById('postTitleInput').value = '';
  document.getElementById('postDescInput').value = '';
  document.getElementById('postFileInput').value = '';
  document.getElementById('postFilePreview').style.display = 'none';

  document.getElementById('shareCategoryPicker').style.display = 'block';
  document.getElementById('createPostForm').style.display = 'none';
  document.getElementById('sharePostModal').classList.add('active');
}

function closeSharePostModal() {
  document.getElementById('sharePostModal').classList.remove('active');
}

function pickCategory(category) {
  pickedCategory = category;
  document.getElementById('pickedCategoryBadge').textContent = category;
  document.getElementById('shareCategoryPicker').style.display = 'none';
  document.getElementById('createPostForm').style.display = 'block';
}

function handlePostFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const sizeInMB = file.size / (1024 * 1024);
  const sizeFormatted = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;

  let type = 'file';
  if (file.type.startsWith('image/')) type = 'image';
  else if (file.type.startsWith('video/')) type = 'video';
  else if (file.name.endsWith('.apk')) type = 'apk';

  const reader = new FileReader();
  reader.onload = () => {
    currentPostFile = {
      name: file.name,
      type,
      dataUrl: reader.result,
      sizeFormatted,
    };
    document.getElementById('postFileName').textContent = file.name;
    document.getElementById('postFilePreview').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

async function handleCreatePostSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('postTitleInput').value.trim();
  const description = document.getElementById('postDescInput').value.trim();

  if (!title) return;
  if (!description && !currentPostFile) {
    alert('Please provide either a description or attach a file.');
    return;
  }

  const postData = {
    category: pickedCategory,
    title,
    description: description || undefined,
    attachment: currentPostFile || undefined,
    authorName: 'ZeptaLabs Officials',
    authorAvatar: 'logo.png',
  };

  const btn = document.getElementById('btnPublishPostSubmit');
  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    if (res.ok) {
      closeSharePostModal();
      btn.disabled = false;
      btn.textContent = 'Publish Post';
      loadPosts();
      const targetSec = pickedCategory === 'News' ? 'news' : 'updates';
      document.getElementById(targetSec)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  } catch {}

  // Fallback local
  const created = {
    ...postData,
    id: 'post_' + Date.now(),
    createdAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
    likes: 0,
    likedBy: [],
    shares: 0,
    comments: [],
  };
  posts.unshift(created);
  localStorage.setItem('zeptalabs_posts', JSON.stringify(posts));
  closeSharePostModal();
  btn.disabled = false;
  btn.textContent = 'Publish Post';
  renderFeed();
}

// Utility to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
