<?php
require_once 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
echo "User: " . ($data['user'] ?? 'NULL') . ", Pass: " . ($data['pass'] ?? 'NULL');
$stmt = $pdo->prepare("SELECT id, nombre, role, avatar FROM usuarios WHERE username = ? AND password = ?");
$stmt->execute([$data['user'] ?? '', $data['pass'] ?? '']);
$user = $stmt->fetch();
echo " Query Result: " . json_encode($user);
?>
