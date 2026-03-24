<?php
require_once 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'], $data['nuevo_estado'])) {
    echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Obtener datos del pedido para saber qué producto descontar si se marca como 'Entregado'
    $stmt = $pdo->prepare("SELECT producto, estado FROM pedidos_bot WHERE id = ?");
    $stmt->execute([$data['id']]);
    $pedido = $stmt->fetch();

    if (!$pedido) throw new Exception("Pedido no encontrado");

    // 2. Actualizar estado del pedido
    $stmt = $pdo->prepare("UPDATE pedidos_bot SET estado = ? WHERE id = ?");
    $stmt->execute([$data['nuevo_estado'], $data['id']]);

    // 3. Si se marca como Entregado, descontar stock de la jaula
    if ($data['nuevo_estado'] === 'Entregado' && $pedido['estado'] !== 'Entregado') {
        // Mapeo simple: '5kg' -> 'cil-5', etc. 
        // El bot envía el tamaño en el JSON. Debemos intentar machear con el ID de la DB
        $prodId = 'cil-5'; // Default
        if (strpos($pedido['producto'], '11') !== false) $prodId = 'cil-11';
        if (strpos($pedido['producto'], '15') !== false) $prodId = 'cil-15';
        if (strpos($pedido['producto'], '45') !== false) $prodId = 'cil-45';

        $stmt = $pdo->prepare("UPDATE productos SET stock_llenos = GREATEST(0, stock_llenos - 1), stock_vacios = stock_vacios + 1 WHERE id = ?");
        $stmt->execute([$prodId]);
    }

    $pdo->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
