<?php
require_once 'api/db.php';

try {
    // 1. Sincronizar precios con los oficiales de Gasco (usados por la IA)
    $pdo->exec("UPDATE productos SET precio = 5200 WHERE id = 'cil-5'");
    $pdo->exec("UPDATE productos SET precio = 9800 WHERE id = 'cil-11'");
    $pdo->exec("UPDATE productos SET precio = 12500 WHERE id = 'cil-15'");
    $pdo->exec("UPDATE productos SET precio = 32000 WHERE id = 'cil-45'");

    // 2. Crear tabla de pedidos del chatbot
    $pdo->exec("CREATE TABLE IF NOT EXISTS pedidos_bot (
        id INT AUTO_INCREMENT PRIMARY KEY,
        producto VARCHAR(50) NOT NULL,
        direccion TEXT NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        total INT NOT NULL,
        estado ENUM('Pendiente', 'En camino', 'Entregado', 'Cancelado') DEFAULT 'Pendiente',
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    echo "Base de datos optimizada para el mercado con éxito.";
} catch (PDOException $e) {
    echo "Error al migrar: " . $e->getMessage();
}
?>
