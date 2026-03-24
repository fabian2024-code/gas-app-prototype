<?php
ob_start();
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_products':
        $stmt = $pdo->query("SELECT * FROM productos");
        if (ob_get_length()) ob_clean();
        echo json_encode($stmt->fetchAll());
        break;

    case 'get_client':
        $rut = $_GET['rut'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM clientes WHERE rut = ?");
        $stmt->execute([$rut]);
        $client = $stmt->fetch();
        if (ob_get_length()) ob_clean();
        echo json_encode($client ?: ['error' => 'Not found']);
        break;

    case 'register_client':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO clientes (rut, nombre, telefono, num_documento, cupones_disponibles) VALUES (?, ?, ?, ?, 2) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), num_documento = VALUES(num_documento)");
        $stmt->execute([$data['rut'], $data['nombre'], $data['telefono'] ?? '', $data['num_documento'] ?? '']);
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => true]);
        break;

    case 'save_transaction':
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO transacciones (rut_cliente, medio_pago, total_normal, total_descuento, total_final, vendedor) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['rut_cliente'], $data['medio_pago'], $data['total_normal'], $data['total_descuento'], $data['total_final'], $data['vendedor'] ?? 'Administrador General']);
            $transaccion_id = $pdo->lastInsertId();

            foreach ($data['items'] as $item) {
                $stmt = $pdo->prepare("INSERT INTO transaccion_items (transaccion_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
                $stmt->execute([$transaccion_id, $item['product']['id'], $item['qty'], $item['product']['price']]);

                // Update Stock
                // In a sale: Llenos -qty, Vacios +qty
                $stmt = $pdo->prepare("UPDATE productos SET stock_llenos = stock_llenos - ?, stock_vacios = stock_vacios + ? WHERE id = ?");
                $stmt->execute([$item['qty'], $item['qty'], $item['product']['id']]);
            }

            // Update Client coupons
            if ($data['total_descuento'] > 0) {
                // Calculate used coupons (for simplicity, we assume 1 coupon per cylinder type that had discount, 
                // but the frontend logic handles the benefit. Let's subtract the number of applied coupons.)
                $numCoupons = count($data['couponCodes']);
                $stmt = $pdo->prepare("UPDATE clientes SET cupones_disponibles = cupones_disponibles - ? WHERE rut = ?");
                $stmt->execute([$numCoupons, $data['rut_cliente']]);
            }

            $pdo->commit();
            if (ob_get_length()) ob_clean();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if (ob_get_length()) ob_clean();
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'update_stock':
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $pdo->beginTransaction();
            foreach ($data['movements'] as $move) {
                $stmt = $pdo->prepare("UPDATE productos SET stock_llenos = stock_llenos + ?, stock_vacios = stock_vacios + ? WHERE id = ?");
                $stmt->execute([$move['full'], $move['empty'], $move['id']]);
            }
            $pdo->commit();
            if (ob_get_length()) ob_clean();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if (ob_get_length()) ob_clean();
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'get_transactions':
        // Get last 20 transactions with items
        $stmt = $pdo->query("SELECT t.*, c.nombre as cliente_nombre FROM transacciones t LEFT JOIN clientes c ON t.rut_cliente = c.rut ORDER BY t.fecha_hora DESC LIMIT 50");
        $txs = $stmt->fetchAll();

        foreach ($txs as &$tx) {
            $stmt = $pdo->prepare("SELECT ti.*, p.nombre, p.icono FROM transaccion_items ti JOIN productos p ON ti.producto_id = p.id WHERE ti.transaccion_id = ?");
            $stmt->execute([$tx['id']]);
            $tx['items'] = $stmt->fetchAll();
        }
        if (ob_get_length()) ob_clean();
        echo json_encode($txs);
        break;
    // Agrega esto dentro del switch, antes del default:
    case 'login':

        if (ob_get_length()) ob_clean();

        $data = json_decode(file_get_contents('php://input'), true);

        // Soporta JSON o form-data
        $user = $data['username'] ?? $_POST['username'] ?? '';
        $pass = $data['password'] ?? $_POST['password'] ?? '';

        try {
            $stmt = $pdo->prepare("SELECT username, role, nombre FROM usuarios WHERE username = ? AND password = ?");
            $stmt->execute([$user, $pass]);
            $usuario = $stmt->fetch();

            if ($usuario) {
                if (ob_get_length()) ob_clean();
                echo json_encode([
                    'success' => true, 
                    'user' => $usuario['username'],
                    'role' => $usuario['role'],
                    'nombre' => $usuario['nombre']
                ]);
            } else {
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => false, 'error' => 'Credenciales inválidas']);
            }
        } catch (PDOException $e) {
            if (ob_get_length()) ob_clean();
            echo json_encode([
                'success' => false,
                'error' => 'Error de BD',
                'detalle' => $e->getMessage()
            ]);
        }

        exit;
    case 'change_password':
        if (ob_get_length()) ob_clean();
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $old_pass = $data['old_password'] ?? '';
        $new_pass = $data['new_password'] ?? '';
        try {
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = ? AND password = ?");
            $stmt->execute([$username, $old_pass]);
            if ($stmt->fetch()) {
                $stmt2 = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = ?");
                $stmt2->execute([$new_pass, $username]);
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => true]);
            } else {
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => false, 'error' => 'Contraseña actual incorrecta']);
            }
        } catch (PDOException $e) {
            if (ob_get_length()) ob_clean();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;

    case 'change_username':
        if (ob_get_length()) ob_clean();
        $data = json_decode(file_get_contents('php://input'), true);
        $old_user = $data['old_username'] ?? '';
        $new_user = $data['new_username'] ?? '';
        $pass     = $data['password'] ?? '';
        try {
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = ? AND password = ?");
            $stmt->execute([$old_user, $pass]);
            if ($stmt->fetch()) {
                $stmt2 = $pdo->prepare("UPDATE usuarios SET username = ? WHERE username = ?");
                $stmt2->execute([$new_user, $old_user]);
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => true]);
            } else {
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta o usuario no encontrado']);
            }
        } catch (PDOException $e) {
            if (ob_get_length()) ob_clean();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;

    default:
        if (ob_get_length()) ob_clean();
        echo json_encode(['error' => 'Invalid action']);
        break;
}
