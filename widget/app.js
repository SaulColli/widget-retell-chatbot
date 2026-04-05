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
  const scriptSrc = new URL(scriptEl.src, window.location.href);
  const BASE_URL = scriptSrc.href.substring(0, scriptSrc.href.lastIndexOf('/widget/'));

  const STYLES_URL = BASE_URL + '/widget/styles.css';
  const API_INIT_URL = BASE_URL + '/api/chat_init.php';
  const API_MSG_URL = BASE_URL + '/api/chat_message.php';
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';

  // Estado
  let shadowRoot = null;
  let isPanelOpen = false;
  let chatId = null;
  let isWaitingForResponse = false;

  const ICONS = {
    chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>`,
    bot: `<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v4h-1c0 1.95-1.15 3.63-2.82 4.47A3 3 0 0 1 16 24H8a3 3 0 0 1-2.18-1.53C4.15 21.63 3 19.95 3 18H2v-4h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 13v2h6v-2H9z"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`
  };

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

  function buildUI() {
    const container = document.createElement('div');
    container.className = 'rw-container';
    container.innerHTML = `
      <button class="rw-fab" id="rw-fab" aria-label="Abrir chat">
        <span class="rw-icon-chat">${ICONS.chat}</span>
        <span class="rw-icon-close">${ICONS.close}</span>
      </button>

      <div class="rw-panel" id="rw-panel">
        <div class="rw-header">
          <div class="rw-header-icon">${ICONS.bot}</div>
          <div class="rw-header-info">
            <div class="rw-header-title">Asistente AI</div>
            <div class="rw-header-status">
              <span class="rw-status-dot"></span><span>En línea</span>
            </div>
          </div>
          <button class="rw-header-close" id="rw-close">${ICONS.close}</button>
        </div>

        <div class="rw-body" id="rw-chat-history">
          <!-- Welcome message placeholder -->
        </div>

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

    // Add default welcome message locally so it doesn't look empty
    appendMessage(container, 'agent', '¡Hola! ¿En qué te puedo ayudar hoy?');
  }

  function bindEvents(container) {
    const fab = container.querySelector('#rw-fab');
    const panel = container.querySelector('#rw-panel');
    const closeBtn = container.querySelector('#rw-close');
    const input = container.querySelector('#rw-input');
    const sendBtn = container.querySelector('#rw-send');

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
      // Auto-resize textarea
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
    try {
      console.log(BASE_URL + "aaaaaaaaaaaaaaaaaaaaaa");
      const resp = await fetch(API_INIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: AGENT_ID })
      });
      if (!resp.ok) throw new Error('Falló inicialización de chat');

      const data = await resp.json();
      chatId = data.chat_id;
      console.log('[RetellChat] Sesión iniciada:', chatId);
    } catch (err) {
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
      // Si todavía no hay chat id, espera e intenta de nuevo
      await initChatSession(container);
      if (!chatId) return;
    }

    // Update UI immediately (optimistic update)
    input.value = '';
    input.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');
    appendMessage(container, 'user', text);

    // Add typing indicator
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
        // En lugar de renderizar todo el array, filtramos o mostramos el último
        // Opcionalmente, mostrar todas las respuestas del agente generadas en este turno
        data.messages.filter(m => m.role === 'agent').forEach(msg => {
          appendMessage(container, 'agent', msg.content);
        });
      } else {
        throw new Error("Respuesta vacía del API");
      }

    } catch (err) {
      removeTypingIndicator(container);
      isWaitingForResponse = false;
      showError(container, 'Hubo un error al recibir respuesta.');
      sendBtn.removeAttribute('disabled');
      input.value = text; // restaurar texto del usuario
    }
  }

  function appendMessage(container, role, text) {
    const history = container.querySelector('#rw-chat-history');
    const div = document.createElement('div');
    div.className = `rw-message rw-message-${role}`;
    div.textContent = text;
    history.appendChild(div);
    scrollToBottom(history);
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
