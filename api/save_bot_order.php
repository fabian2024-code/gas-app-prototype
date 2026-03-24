<?php
require_once 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['product'], $data['address'], $data['phone'])) {
    echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO pedidos_bot (producto, direccion, telefono, total, estado) VALUES (?, ?, ?, ?, 'Pendiente')");
    $stmt->execute([
        $data['product'],
        $data['address'],
        $data['phone'],
        isset($data['total']) ? intval(str_replace(['$', '.', ','], '', $data['total'])) : 0
    ]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
