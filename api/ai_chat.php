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

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

$sysPrompt = "Eres el asistente inteligente de ventas de GasControl, distribuidor oficial de Gasco.
Vendes cilindros de 5 kg ($5,200), 11 kg ($9,800), 15 kg ($12,500) y 45 kg ($32,000).
REGLAS DE PRECIO:
- Todo pedido tiene un costo de despacho fijo de $1,500.
- Si el cliente es \"Adulto Mayor\", aplícale un 10% de descuento sobre el precio del cilindro (no sobre el despacho).
- Si es su primer pedido, regálale un bono de -$2,000 de descuento total.
Tu personalidad es amable, profesional y rápida. Usas emojis naturales. Jamás inventes productos ni precios diferentes. Siempre menciona el total desglosado (Cilindro + Despacho - Descuento).
Para completar un pedido necesitas 3 datos obligatorios:
1) Tamaño del cilindro.
2) Dirección exacta.
3) Teléfono.
Cuando tengas la confirmación de esos datos y el cliente acepte el precio total, finaliza reproduciendo EXACTAMENTE Y ÚNICAMENTE este bloque JSON:
{\"action\": \"ORDER\", \"product\": \"[TAMAÑO]\", \"address\": \"[DIRECCION]\", \"phone\": \"[TELEFONO]\", \"total\": \"[TOTAL_CALCULADO]\"}";

$fakeHistory = [
    ["role" => "user", "parts" => [["text" => "INSTRUCCIÓN DEL SISTEMA: " . $sysPrompt]]],
    ["role" => "model", "parts" => [["text" => "Entendido perfectamente. Actuaré estrictamente como el vendedor de GasControl detallado en la instrucción."]]]
];

$data = [
    "contents" => array_merge($fakeHistory, $input['messages']),
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
