<?php
require_once 'db.php';

try {
    // 1. Create 'usuarios' table
    $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'vendedor', 'repartidor') DEFAULT 'vendedor',
        nombre VARCHAR(100)
    )");

    // 2. Create 'pedidos' table (for field route)
    $pdo->exec("CREATE TABLE IF NOT EXISTS pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_rut VARCHAR(20),
        cliente_nombre VARCHAR(100),
        direccion VARCHAR(255),
        monto DECIMAL(10,2),
        status ENUM('pendiente', 'asignado', 'entregado', 'cancelado') DEFAULT 'pendiente',
        repartidor_id INT,
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repartidor_id) REFERENCES usuarios(id)
    )");

    // 3. Insert/Update default users (Warning: Plain text for demo)
    $stmt = $pdo->prepare("INSERT INTO usuarios (username, password, role, nombre) VALUES (?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), nombre = VALUES(nombre)");
    $stmt->execute(['admin', 'admin', 'admin', 'Administrador General']);
    $stmt->execute(['vendedor', 'vendedor', 'vendedor', 'Vendedor de Turno']);
    $stmt->execute(['repartidor', 'repartidor', 'repartidor', 'Juan Chófer']);

    echo json_encode(['success' => true, 'message' => 'Tablas de Usuarios y Pedidos creadas. Usuarios iniciales cargados.']);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
