<?php
// api/ai_chat.php
header('Content-Type: application/json');
require_once 'config.php'; 

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Use POST']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['messages'])) {
    echo json_encode(['error' => 'No messages provided']);
    exit;
}

$apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';

if (empty($apiKey) || $apiKey === 'INGRESA_TU_API_KEY_AQUI') {
    echo json_encode([
        'error' => 'API Key no configurada', 
        'botResponse' => '🔌 ¡Hola! Soy el nuevo cerebro de IA de GasControl. Aún no he sido encendido completamente. Dile al administrador que agregue mi API Key de Gemini en el archivo `api/config.php` para cobrar vida.'
    ]);
    exit;
}

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" . $apiKey;

$sysPrompt = "Eres el asistente inteligente de ventas de GasControl, distribuidor oficial de Gasco.
Vendes cilindros de 5 kg ($5,200), 11 kg ($9,800), 15 kg ($12,500) y 45 kg ($32,000).
Tu personalidad es amable, profesional y rápida. Usas emojis naturales. Jamás inventes productos ni precios diferentes.
Para completar un pedido necesitas 3 datos obligatorios del cliente:
1) El tamaño del cilindro.
2) La dirección de entrega exacta.
3) Un número de teléfono de contacto.
Pregunta estos datos paso a paso conversando con el cliente de forma natural, no le tires todas las preguntas de una sola vez. Cuando inicie la venta pregunta el tamaño. Cuando tengas el tamaño, pregunta direccion. Cuando tengas la direccion, pregunta el telefono.
Cuando tengas la confirmación de esos 3 datos, finaliza el proceso reproduciendo EXACTAMENTE Y ÚNICAMENTE este bloque JSON, sin escribir ni una sola letra o saludo extra antes ni después de las llaves:
{\"action\": \"ORDER\", \"product\": \"[TAMAÑO]\", \"address\": \"[DIRECCION]\", \"phone\": \"[TELEFONO]\"}";

$data = [
    "system_instruction" => [
        "parts" => [
            ["text" => $sysPrompt]
        ]
    ],
    "contents" => $input['messages'],
    "generationConfig" => [
        "temperature" => 0.3
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Para evitar problemas en XAMPP

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['error' => 'Error de conexión con IA', 'details' => json_decode($response)]);
    exit;
}

$json = json_decode($response, true);
$botText = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';

echo json_encode(['botResponse' => trim($botText)]);
