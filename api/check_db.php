<?php
require_once 'db.php';
$stmt = $pdo->query("DESCRIBE usuarios");
echo json_encode($stmt->fetchAll());
?>
