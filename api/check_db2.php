<?php
require_once 'db.php';
$stmt = $pdo->query("SELECT * FROM usuarios");
echo json_encode($stmt->fetchAll());
?>
