<?php
require_once 'db.php';

try {
    // Drop existing table if it's the wrong one
    $pdo->exec("DROP TABLE IF EXISTS usuarios");

    // Create the correct one
    $pdo->exec("
        CREATE TABLE usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario VARCHAR(50) UNIQUE,
            password VARCHAR(255),
            nombre VARCHAR(100),
            role VARCHAR(50),
            avatar LONGTEXT
        )
    ");

    // Insert admin
    $stmt = $pdo->prepare("INSERT INTO usuarios (usuario, password, nombre, role, avatar) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute(['admin', 'admin123', 'Administrador', 'admin', '']);

    echo "Database setup complete.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
