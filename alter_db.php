<?php
require_once 'api/db.php';
try {
    // Modify transacciones.id to be AUTO_INCREMENT
    // Note: If there are existing IDs, we should make sure they are preserved.
    // In MySQL, this should work as long as the column is the primary key.
    $pdo->exec("ALTER TABLE transacciones MODIFY COLUMN id BIGINT AUTO_INCREMENT");
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
