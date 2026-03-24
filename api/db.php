<?php
$host = 'localhost';
$db = 'gascontrol_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

try {
     $pdo = new PDO($dsn, $user, $pass);
     $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
     $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
     header('Content-Type: application/json', true, 500);
     if (ob_get_length()) ob_clean();
     echo json_encode([
          'error' => 'Error de conexión',
          'detalles' => $e->getMessage()
     ]);
     exit;
}
