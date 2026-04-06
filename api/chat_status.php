<?php
// api/chat_status.php
require_once 'config.php';

// Validar método
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$chat_id = isset($_GET['chat_id']) ? $_GET['chat_id'] : '';

if (!$chat_id) {
    http_response_code(400);
    echo json_encode(['error' => 'chat_id is required']);
    exit();
}

$retellUrl = "https://api.retellai.com/get-chat/" . urlencode($chat_id);

$ch = curl_init($retellUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . RETELL_API_KEY
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
