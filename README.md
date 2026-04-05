# Widget Inteligente Fluenty con Retell AI 🤖💬

Un proyecto completo y ligero que integra un Asistente basado en Inteligencia Artificial (Retell AI) directamente en cualquier página web. 

Este sistema no utiliza librerías de terceros en el Frontend (Vanilla JS) y cuenta con un Backend ligero y seguro escrito en PHP para enmascarar las credenciales contra accesos desde el navegador y administrar de paso los webhooks de las llamadas opcionales.

---

## 🏗️ Arquitectura Básica
El flujo de la aplicación se divide en 2 partes fundamentales:

1. **Frontend (El Widget):** Consiste en `widget/app.js` y `widget/styles.css`. Contiene toda la lógica visual, renderizado del chat, animaciones e inyección al DOM mediante `Shadow DOM` (para evitar colisiones de estilos css con tu proyecto).
2. **Backend (La API Proxy en PHP):** Los archivos ubicados en `/api`. Son los encargados de recibir las peticiones que hace el Widget usando AJAX y comunicarse con los servidores oficiales de **Retell AI**. Esto asegura que tu *API Key* jamás queda expuesta en el código de Javascript que llega a los usuarios.

---

## 📋 Requisitos Previos

Para ejecutar y probar este entorno local necesitas:

* Un Servidor Local que lea PHP como **XAMPP**, WAMP o Laragon (Probado en PHP 7.4+ u 8.x).
* Una cuenta en [Retell AI](https://beta.retellai.com/dashboard)
* **API Key** de Retell AI válida.
* Un **Text/Chat Agent ID** originado en la plataforma de Retell AI. (❗ Asegúrate de que el Agente seleccionado sea de CHAT, no de Voice).

---

## 🛠️ Instalación y Configuración

Sigue estos pasos para levantar rápidamente el entorno en tu máquina local.

### 1. Ubicar el proyecto
Asegúrate de que la carpeta raíz del proyecto (la carpeta donde se encuentra este `README.md`) esté dentro del directorio de despliegue de tu servidor web. En XAMPP, suele ser:
`C:\xampp\htdocs\TestWidgetFluenty`

### 2. Configurar el Backend (Credenciales API) 🔒
Navega a la carpeta `/api` y edita el archivo `config.php`.

```php
// En /api/config.php

// 1. Modifica esto y pon tu verdadera API KEY de Retell AI:
define('RETELL_API_KEY', 'key_XXXXXXXXXXXXXXXXXXXXXXXXXX');

// 2. (Opcional) Agrega Webhook Secret si configurarás los flujos de voz post-llamada.
define('RETELL_WEBHOOK_SECRET', 'TU_WEBHOOK_SECRET_AQUI');
```

*Nota: La carpeta `api/` se protege por sí misma gracias al archivo `.htaccess` ubicado en la raíz, que bloquea accesos directos de lectura hacia los `config.php`.*

### 3. Configurar el Frontend (Asignar Agente) 🌐
Abre el archivo `index.html` (o el index de la web en la que desees incrustar el widget) y busca la etiqueta script del final:

```html
<!-- index.html -->
<script
  src="widget/app.js"
  data-agent-id="agent_EL_ID_DE_TU_NUEVO_AGENTE_AQUI"
  defer>
</script>
```
Cambia el parámetro `data-agent-id` por el ID de texto generado en tu consola de Retell AI.

---

## 🚀 Cómo ejecutar el Servidor

1. Abre el panel de control de **XAMPP**.
2. Dale al botón **Start** en el módulo de **Apache**.
3. Abre tu navegador e ingresa a:
   👉 `http://localhost/TestWidgetFluenty/index.html`

Verás tu entorno demo y podrás probar la ventana de Chat.

### ¿Usando Ngrok? (Exponer a Internet)
Si necesitas mostrar esta página y widget a personas ajenas a tu red, o si quieres usar Webhooks oficiales de Retell de llamadas, debes exponer XAMPP mediante puertos.

Con `ngrok` instalado, abre una terminal y corre:
```bash
ngrok http 80
```
Te entregará un enlace HTTPS (`https://xxx-xx-x.ngrok.app`). Ábrelo de la siguiente manera:
👉 `https://xxx-xx-x.ngrok.app/TestWidgetFluenty/index.html`

---

## 📁 Estructura del Directorio

```text
TestWidgetFluenty/
│
├── .htaccess               # Reglas de seguridad vitales (Bloqueo directorios, configs, logs y setup de CORS)
├── index.html              # Demo HTML para visualizar e inyectar el Widget.
├── README.md               # Este archivo de documentación.
│
├── api/                    # PROXY PHP 
│   ├── chat_init.php       # Endpoint inicial para instanciar la sesión (/create-chat)
│   ├── chat_message.php    # Endpoint recurrente para solicitar/enviar msjs (/create-chat-completion)
│   ├── webhook.php         # Recibidor pasivo de Webhooks (Call ended, Analyzed, etc.)
│   ├── config.php          # Credenciales Globales.
│   └── logs/               # Almacena los registros de webhooks (.log) protegidos
│
└── widget/                 # ECOSISTEMA FRONTEND
    ├── app.js              # Controlador Lógico Vanilla JS, eventos e inyección de DOM.
    └── styles.css          # Aspectos visuales (Colores, animaciones, fab buttons) cargados por app.js.
```
