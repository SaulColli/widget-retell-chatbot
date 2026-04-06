<?php
// api/chat_init.php
require_once 'config.php';

// Validar método
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Leer entrada
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['agent_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'agent_id is required']);
    exit();
}

// Preparar petición a Retell AI
$retellUrl = 'https://api.retellai.com/create-chat';

$payload = [
    'agent_id' => $data['agent_id']
];

if (isset($data['canal'])) {
    $payload['retell_llm_dynamic_variables'] = [
        'canal' => $data['canal']
    ];
    $payload['metadata'] = [
        'canal' => $data['canal']
    ];
}

$ch = curl_init($retellUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
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
