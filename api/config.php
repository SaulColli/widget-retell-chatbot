<?php
/**
 * =============================================
 * CONFIGURACIÓN CENTRALIZADA DEL WIDGET
 * =============================================
 * Este archivo contiene las credenciales y configuración
 * para la comunicación con Retell AI.
 *
 * ⚠️ NUNCA exponer este archivo al público.
 *    Está protegido por .htaccess.
 * =============================================
 */

// ── Credenciales de Retell AI ──
define('RETELL_API_KEY', 'key_xxxxxxxxxxxxxxxxxxxxxx');
define('RETELL_API_BASE', 'https://api.retellai.com');

// ── Secreto para verificar webhooks de Retell (HMAC SHA256) ──
// Encuéntralo en tu dashboard de Retell AI → Settings → Webhooks
define('RETELL_WEBHOOK_SECRET', 'TU_WEBHOOK_SECRET_AQUI');

// ── Orígenes permitidos (CORS) ──
// En producción, restringe a tu dominio real.
// Para desarrollo con ngrok, usa '*' o tu URL de ngrok.
define('ALLOWED_ORIGINS', '*');

// ── Directorio de logs ──
define('LOG_DIR', __DIR__ . '/logs');

// Crear directorio de logs si no existe
if (!is_dir(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

/**
 * Envía las cabeceras CORS apropiadas.
 * Llama a esta función al inicio de cada endpoint público.
 */
function send_cors_headers()
{
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    // Manejar preflight OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Responde con un error JSON y termina la ejecución.
 */
function send_error($message, $httpCode = 400)
{
    http_response_code($httpCode);
    echo json_encode(['error' => true, 'message' => $message]);
    exit;
}

/**
 * Responde con un JSON de éxito.
 */
function send_json($data, $httpCode = 200)
{
    http_response_code($httpCode);
    echo json_encode($data);
    exit;
}
