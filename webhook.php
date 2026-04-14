<?php
/**
 * =============================================
 * RECEPTOR DE WEBHOOKS — RETELL AI
 * =============================================
 * Recibe eventos POST de Retell AI cuando ocurren
 * eventos en las llamadas (call_started, call_ended,
 * call_analyzed, etc.).
 *
 * Configura esta URL en tu dashboard de Retell AI:
 *   https://tu-ngrok-url/api/webhook.php
 *
 * Endpoint: POST /api/webhook.php
 * =============================================
 */

require_once __DIR__ . '/config.php';

// ── CORS ──
send_cors_headers();

// ── Solo aceptar POST ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Método no permitido.', 405);
}

// ── Leer el cuerpo crudo de la petición ──
$rawBody = file_get_contents('php://input');

// ── Verificar firma HMAC (si el webhook secret está configurado) ──
$signature = isset($_SERVER['HTTP_X_RETELL_SIGNATURE'])
    ? $_SERVER['HTTP_X_RETELL_SIGNATURE']
    : '';

if (RETELL_WEBHOOK_SECRET !== 'TU_WEBHOOK_SECRET_AQUI' && !empty(RETELL_WEBHOOK_SECRET)) {
    // Solo validar si el secreto está configurado
    $expectedSignature = hash_hmac('sha256', $rawBody, RETELL_WEBHOOK_SECRET);

    if (!hash_equals($expectedSignature, $signature)) {
        error_log("[RetellWidget] Webhook: Firma inválida");
        send_error('Firma de webhook inválida.', 401);
    }
}

// ── Parsear el evento ──
$event = json_decode($rawBody, true);

if (!$event || !isset($event['event'])) {
    send_error('Payload de webhook inválido.', 400);
}

$eventType = $event['event'];
$callId    = isset($event['call']['call_id']) ? $event['call']['call_id'] : 'N/A';
$agentId   = isset($event['call']['agent_id']) ? $event['call']['agent_id'] : 'N/A';

// ── Procesar según tipo de evento ──
switch ($eventType) {
    case 'call_started':
        $logMsg = "CALL_STARTED | call_id=$callId | agent=$agentId";
        break;

    case 'call_ended':
        $duration   = isset($event['call']['duration_ms']) ? $event['call']['duration_ms'] : 0;
        $endReason  = isset($event['call']['end_reason']) ? $event['call']['end_reason'] : 'unknown';
        $logMsg     = "CALL_ENDED | call_id=$callId | agent=$agentId | duration={$duration}ms | reason=$endReason";
        break;

    case 'call_analyzed':
        $summary   = isset($event['call']['call_analysis']['call_summary'])
            ? $event['call']['call_analysis']['call_summary']
            : '';
        $sentiment = isset($event['call']['call_analysis']['user_sentiment'])
            ? $event['call']['call_analysis']['user_sentiment']
            : '';
        $logMsg    = "CALL_ANALYZED | call_id=$callId | sentiment=$sentiment | summary=" . substr($summary, 0, 100);
        break;

    default:
        $logMsg = "UNKNOWN_EVENT ($eventType) | call_id=$callId";
        break;
}

// ── Guardar log ──
$logEntry = date('Y-m-d H:i:s') . " | $logMsg\n";
file_put_contents(LOG_DIR . '/webhook.log', $logEntry, FILE_APPEND | LOCK_EX);

// ── Responder 200 OK para confirmar recepción ──
send_json(['status' => 'ok', 'event' => $eventType]);
