<?php
// ajax.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Leer entrada global para actions que lo requieran
$input = file_get_contents('php://input');
$data = json_decode($input, true);

switch ($action) {
    case 'init':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            exit();
        }
        
        if (!isset($data['agent_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'agent_id is required']);
            exit();
        }
        
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
        break;

    case 'message':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            exit();
        }
        
        if (!isset($data['chat_id']) || !isset($data['content'])) {
            http_response_code(400);
            echo json_encode(['error' => 'chat_id and content are required']);
            exit();
        }
        
        $retellUrl = "https://api.retellai.com/create-chat-completion";
        $payload = [
            'chat_id' => $data['chat_id'],
            'content' => $data['content']
        ];
        
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
        break;

    case 'status':
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
        break;

    case 'end':
        if ($method !== 'PATCH' && $method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            exit();
        }
        
        if (!isset($data['chat_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'chat_id is required']);
            exit();
        }
        
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
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Action invalid']);
        break;
}
