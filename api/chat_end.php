<?php
// api/chat_end.php
require_once 'config.php';

// Validar método
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'PATCH' && $method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Leer entrada
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['chat_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'chat_id is required']);
    exit();
}

// Preparar petición a Retell AI (End Chat)
$retellUrl = 'https://api.retellai.com/end-chat/' . urlencode($data['chat_id']);

$ch = curl_init($retellUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . RETELL_API_KEY,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'CURL Request Failed: ' . $error]);
    exit();
}

http_response_code($httpCode);
echo $response;
