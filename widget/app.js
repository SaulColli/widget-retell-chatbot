/**
 * =============================================
 * RETELL CHAT WIDGET — Inyector Principal
 * =============================================
 * Widget de chat de texto que se conecta a Retell AI
 * a través de un backend PHP seguro.
 */
(function () {
  'use strict';

  const scriptEl = document.querySelector('script[data-agent-id]');
  if (!scriptEl) {
    console.error('[RetellChat] No se encontró el tag <script> con data-agent-id.');
    return;
  }

  const AGENT_ID = scriptEl.getAttribute('data-agent-id');
  const CANAL = scriptEl.getAttribute('data-canal') || 'WIDGET';
  const scriptSrc = new URL(scriptEl.src, window.location.href);
  const BASE_URL = scriptSrc.href.substring(0, scriptSrc.href.lastIndexOf('/widget/'));

  const STYLES_URL = BASE_URL + '/widget/styles.css';
  const API_INIT_URL = BASE_URL + '/api/chat_init.php';
  const API_MSG_URL = BASE_URL + '/api/chat_message.php';
  const API_STATUS_URL = BASE_URL + '/api/chat_status.php';
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';

  const DEFAULT_GREETING = 'Hola, gracias por contactar con Ocean Tours. Soy Sara. ¿En qué puedo ayudarle hoy?';

  // Estado
  let shadowRoot = null;
  let isPanelOpen = false;
  let isSidebarOpen = false;
  let chatId = null;
  let isWaitingForResponse = false;

  const LS_CHAT_ID = 'RW_CHAT_ID';
  const LS_CHAT_LIST = 'RW_CHAT_LIST';

  const ICONS = {
    chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>`,
    bot: `<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v4h-1c0 1.95-1.15 3.63-2.82 4.47A3 3 0 0 1 16 24H8a3 3 0 0 1-2.18-1.53C4.15 21.63 3 19.95 3 18H2v-4h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 13v2h6v-2H9z"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    menu: `<svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`
  };

  // -------------------------
  // LocalStorage Logic
  // -------------------------
  function getChatList() {
    try {
      return JSON.parse(localStorage.getItem(LS_CHAT_LIST)) || [];
    } catch {
      return [];
    }
  }

  function saveChatList(list) {
    localStorage.setItem(LS_CHAT_LIST, JSON.stringify(list));
  }

  function saveMessage(role, content) {
    if (!chatId) return;
    const list = getChatList();
    let chat = list.find(c => c.id === chatId);
    if (!chat) {
      chat = { id: chatId, title: 'Nuevo chat...', date: new Date().toISOString(), history: [] };
      list.unshift(chat);
    }
    chat.history.push({ role, content });

    if (role === 'user' && chat.history.filter(m => m.role === 'user').length === 1) {
      chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }

    chat.date = new Date().toISOString();

    const filtered = list.filter(c => c.id !== chatId);
    filtered.unshift(chat);
    saveChatList(filtered);

    if (shadowRoot) {
      const container = shadowRoot.querySelector('.rw-container');
      if (container) renderSidebarList(container);
    }
  }

  function loadChat(container, targetId) {
    const list = getChatList();
    const chat = list.find(c => c.id === targetId);
    if (!chat) return false;

    chatId = chat.id;
    localStorage.setItem(LS_CHAT_ID, chatId);

    const historyContainer = container.querySelector('#rw-chat-history');
    historyContainer.innerHTML = '';

    const input = container.querySelector('#rw-input');
    input.removeAttribute('disabled');
    input.placeholder = "Escribe un mensaje...";

    if (chat.history.length === 0) {
      appendMessage(container, 'agent', '¡Hola! ¿En qué te puedo ayudar hoy?', false);
    } else {
      chat.history.forEach(msg => {
        appendMessage(container, msg.role, msg.content, false);
      });
    }
    
    if (chat.status === 'ended') {
       handleChatEnded(container);
    } else {
       checkChatEnded(container, targetId);
    }
    
    return true;
  }

  async function createNewChat(container) {
    chatId = null;
    localStorage.removeItem(LS_CHAT_ID);
    const historyContainer = container.querySelector('#rw-chat-history');
    historyContainer.innerHTML = '';
    
    const input = container.querySelector('#rw-input');
    input.removeAttribute('disabled');
    input.placeholder = "Escribe un mensaje...";

    appendMessage(container, 'agent', DEFAULT_GREETING, false);
    renderSidebarList(container);
    // Initialise immediately so we have a chatId available
    await initChatSession(container);
  }

  // -------------------------
  // Main Logic
  // -------------------------
  function injectFont() {
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }

  async function createWidget() {
    injectFont();

    const host = document.createElement('div');
    host.id = 'retell-chat-host';
    host.style.cssText = 'position:fixed;z-index:999997;bottom:0;right:0;pointer-events:none;';
    document.body.appendChild(host);

    shadowRoot = host.attachShadow({ mode: 'closed' });

    try {
      const resp = await fetch(STYLES_URL);
      if (resp.ok) {
        const style = document.createElement('style');
        style.textContent = await resp.text();
        shadowRoot.appendChild(style);
      }
    } catch (e) {
      console.warn('Could not load separate CSS, widget might look unstyled', e);
    }

    buildUI();
  }

  async function syncAllChatsStatus(container) {
    const list = getChatList();
    let updated = false;

    await Promise.all(list.map(async (chat) => {
      if (chat.status === 'ended') return;
      
      try {
        const resp = await fetch(`${API_STATUS_URL}?chat_id=${chat.id}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.chat_status === 'ended' || data.chat_status === 'completed' || data.chat_status === 'done' || data.chat_status === 'cancelled') {
            chat.status = 'ended';
            updated = true;
          }
        }
      } catch (e) {
        console.warn('Sync failed for chat', chat.id);
      }
    }));

    if (updated) {
      saveChatList(list);
      const current = list.find(c => c.id === chatId);
      if (current && current.status === 'ended') {
          handleChatEnded(container);
      }
      renderSidebarList(container);
    }
  }

  function buildUI() {
    const container = document.createElement('div');
    container.className = 'rw-container';
    container.innerHTML = `
      <button class="rw-fab" id="rw-fab" aria-label="Abrir chat">
        <span class="rw-icon-chat">${ICONS.chat}</span>
        <span class="rw-icon-close">${ICONS.close}</span>
      </button>

      <div class="rw-panel" id="rw-panel">

        <div class="rw-sidebar-overlay" id="rw-sidebar-overlay"></div>
        <div class="rw-sidebar" id="rw-sidebar">
           <div class="rw-sidebar-header">
             <div class="rw-sidebar-title">Chats</div>
             <button class="rw-header-close" id="rw-sidebar-close" title="Cerrar menú">${ICONS.close}</button>
           </div>
           <button class="rw-new-chat-btn" id="rw-new-chat">${ICONS.plus} Nuevo chat</button>
           <div class="rw-chat-list" id="rw-chat-list"></div>
        </div>

        <div class="rw-header">
          <button class="rw-header-menu" id="rw-menu-btn" title="Historial">${ICONS.menu}</button>
          <div class="rw-header-icon">${ICONS.bot}</div>
          <div class="rw-header-info">
            <div class="rw-header-title">Asistente AI</div>
            <div class="rw-header-status">
              <span class="rw-status-dot"></span><span>En línea</span>
            </div>
          </div>
          <button class="rw-header-close" id="rw-close" title="Cerrar emergente">${ICONS.close}</button>
        </div>

        <div class="rw-body" id="rw-chat-history"></div>

        <div class="rw-footer">
          <div class="rw-input-wrapper">
            <textarea class="rw-input" id="rw-input" placeholder="Escribe un mensaje..." rows="1"></textarea>
          </div>
          <button class="rw-send-btn" id="rw-send" disabled>${ICONS.send}</button>
        </div>
      </div>
    `;
    shadowRoot.appendChild(container);
    bindEvents(container);

    const savedId = localStorage.getItem(LS_CHAT_ID);
    if (savedId && getChatList().some(c => c.id === savedId)) {
      loadChat(container, savedId);
    } else {
      appendMessage(container, 'agent', DEFAULT_GREETING, false);
    }
    
    syncAllChatsStatus(container);
  }

  function renderSidebarList(container) {
    const listEl = container.querySelector('#rw-chat-list');
    listEl.innerHTML = '';
    const list = getChatList();
    list.forEach(chat => {
      const div = document.createElement('div');
      div.className = 'rw-chat-item' + (chat.id === chatId ? ' rw-active' : '');

      const dateObj = new Date(chat.date);
      const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `<div class="rw-chat-title">${escapeHTML(chat.title)}</div><div class="rw-chat-date">${dateStr}</div>`;
      div.addEventListener('click', () => {
        loadChat(container, chat.id);
        renderSidebarList(container);

        isSidebarOpen = false;
        container.querySelector('#rw-sidebar').classList.remove('rw-open');
        container.querySelector('#rw-sidebar-overlay').classList.remove('rw-visible');
      });
      listEl.appendChild(div);
    });
  }

  function bindEvents(container) {
    const fab = container.querySelector('#rw-fab');
    const panel = container.querySelector('#rw-panel');
    const closeBtn = container.querySelector('#rw-close');
    const input = container.querySelector('#rw-input');
    const sendBtn = container.querySelector('#rw-send');

    // Sidebar elements
    const menuBtn = container.querySelector('#rw-menu-btn');
    const sidebar = container.querySelector('#rw-sidebar');
    const overlay = container.querySelector('#rw-sidebar-overlay');
    const sidebarClose = container.querySelector('#rw-sidebar-close');
    const newChatBtn = container.querySelector('#rw-new-chat');

    function toggleSidebar(open) {
      isSidebarOpen = open;
      sidebar.classList.toggle('rw-open', isSidebarOpen);
      overlay.classList.toggle('rw-visible', isSidebarOpen);
      if (open) renderSidebarList(container);
    }

    menuBtn.addEventListener('click', () => toggleSidebar(true));
    sidebarClose.addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));

    newChatBtn.addEventListener('click', async () => {
      toggleSidebar(false);
      await createNewChat(container);
    });

    fab.addEventListener('click', () => {
      isPanelOpen = !isPanelOpen;
      fab.classList.toggle('rw-open', isPanelOpen);
      panel.classList.toggle('rw-visible', isPanelOpen);

      if (isPanelOpen) {
        input.focus();
        if (!chatId) initChatSession(container);
      }
    });

    closeBtn.addEventListener('click', () => {
      isPanelOpen = false;
      fab.classList.remove('rw-open');
      panel.classList.remove('rw-visible');
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = (input.scrollHeight) + 'px';

      if (input.value.trim() && !isWaitingForResponse) {
        sendBtn.removeAttribute('disabled');
      } else {
        sendBtn.setAttribute('disabled', 'true');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(container);
      }
    });

    sendBtn.addEventListener('click', () => sendMessage(container));
  }

  async function initChatSession(container) {
    if (chatId) return;

    showTypingIndicator(container);

    try {
      const resp = await fetch(API_INIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: AGENT_ID,
          canal: CANAL
        })
      });

      removeTypingIndicator(container);

      if (!resp.ok) throw new Error('Falló inicialización de chat');

      const data = await resp.json();
      chatId = data.chat_id;
      localStorage.setItem(LS_CHAT_ID, chatId);

      const list = getChatList();
      if (!list.find(c => c.id === chatId)) {
        list.unshift({ id: chatId, title: 'Nuevo chat...', date: new Date().toISOString(), history: [] });
        saveChatList(list);
      }

      saveMessage('agent', DEFAULT_GREETING);

      renderSidebarList(container);

    } catch (err) {
      removeTypingIndicator(container);
      console.error(err);
      showError(container, 'No se pudo conectar al asistente.');
    }
  }

  async function sendMessage(container) {
    const input = container.querySelector('#rw-input');
    const sendBtn = container.querySelector('#rw-send');
    const text = input.value.trim();
    if (!text || isWaitingForResponse) return;

    if (!chatId) {
      await initChatSession(container);
      if (!chatId) return;
    }

    input.value = '';
    input.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');
    appendMessage(container, 'user', text, true);

    showTypingIndicator(container);
    isWaitingForResponse = true;

    try {
      const resp = await fetch(API_MSG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, content: text })
      });

      removeTypingIndicator(container);
      isWaitingForResponse = false;

      if (!resp.ok) throw new Error('Error al enviar mensaje');
      const data = await resp.json();

      if (data.messages && data.messages.length > 0) {
        data.messages.filter(m => m.role === 'agent').forEach(msg => {
          appendMessage(container, 'agent', msg.content, true);
        });
      }

      // Check if chat ended natively
      checkChatEnded(container, chatId);

    } catch (err) {
      removeTypingIndicator(container);
      isWaitingForResponse = false;
      showError(container, 'Hubo un error al recibir respuesta.');
      sendBtn.removeAttribute('disabled');
      input.value = text;
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  function formatMessageText(text) {
    const safeText = escapeHTML(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const linkedText = safeText.replace(urlRegex, function (url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    return linkedText.replace(/\n/g, '<br>');
  }

  function appendMessage(container, role, text, save = true) {
    if (!text) return; // Prevent empty messages
    const history = container.querySelector('#rw-chat-history');
    const div = document.createElement('div');
    div.className = `rw-message rw-message-${role}`;
    div.innerHTML = formatMessageText(text);
    history.appendChild(div);
    scrollToBottom(history);

    if (save) {
      saveMessage(role, text);
    }
  }

  function handleChatEnded(container) {
    const input = container.querySelector('#rw-input');
    const sendBtn = container.querySelector('#rw-send');

    input.setAttribute('disabled', 'true');
    input.placeholder = "El chat ha finalizado.";
    sendBtn.setAttribute('disabled', 'true');

    const history = container.querySelector('#rw-chat-history');
    if (!history.querySelector('.rw-chat-ended-msg')) {
      const div = document.createElement('div');
      div.className = 'rw-chat-ended-msg';
      div.style.cssText = "text-align: center; color: var(--rw-text-muted); font-size: 13px; margin: 16px 0;";
      div.textContent = "Chat ended";
      history.appendChild(div);
      scrollToBottom(history);
    }
  }

  function markChatAsEnded(targetId) {
    const list = getChatList();
    const chat = list.find(c => c.id === targetId);
    if (chat && chat.status !== 'ended') {
        chat.status = 'ended';
        saveChatList(list);
    }
  }

  async function checkChatEnded(container, targetChatId) {
    if (!targetChatId) return;
    try {
      const resp = await fetch(`${API_STATUS_URL}?chat_id=${targetChatId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.chat_status === 'ended' || data.chat_status === 'completed' || data.chat_status === 'done' || data.chat_status === 'cancelled') {
          markChatAsEnded(targetChatId);
          if (chatId === targetChatId) {
             handleChatEnded(container);
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo verificar el status del chat", e);
    }
  }

  function showTypingIndicator(container) {
    const history = container.querySelector('#rw-chat-history');
    const div = document.createElement('div');
    div.className = 'rw-typing-indicator';
    div.id = 'rw-typing';
    div.innerHTML = `<div class="rw-typing-dot"></div><div class="rw-typing-dot"></div><div class="rw-typing-dot"></div>`;
    history.appendChild(div);
    scrollToBottom(history);
  }

  function removeTypingIndicator(container) {
    const typing = container.querySelector('#rw-typing');
    if (typing) typing.remove();
  }

  function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
  }

  function showError(container, msg) {
    const toast = document.createElement('div');
    toast.className = 'rw-error-toast';
    toast.textContent = msg;
    const panel = container.querySelector('#rw-panel');
    panel.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
