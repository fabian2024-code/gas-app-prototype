<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h3>Diagnosticando Conexión...</h3>";

$host = 'localhost';
$db   = 'gascontrol_db';
$user = 'root'; 
$pass = '';     

try {
    echo "1. Intentando conectar a MySQL ($host)...<br>";
    $conn = mysqli_connect($host, $user, $pass);
    if (!$conn) {
        die("FALLA: No se pudo conectar a MySQL. Error: " . mysqli_connect_error());
    }
    echo "CONECTADO A MYSQL OK.<br><br>";

    echo "2. Intentando seleccionar la base de datos '$db'...<br>";
    if (!mysqli_select_db($conn, $db)) {
        die("FALLA: No se encontró la base de datos '$db'. Asegúrate de haberla creado en phpMyAdmin.");
    }
    echo "BASE DE DATOS OK.<br><br>";

    echo "2b. Verificando campos de la tabla 'clientes'...<br>";
    $res = mysqli_query($conn, "SHOW COLUMNS FROM clientes LIKE 'num_documento'");
    if (mysqli_num_rows($res) === 0) {
        echo "<b style='color:red'>AVISO: No existe la columna 'num_documento'.</b> Esto causará error al registrar nuevos clientes. FAVOR RE-IMPORTAR el archivo database.sql en phpMyAdmin.<br><br>";
    } else {
        echo "Columna 'num_documento' OK.<br><br>";
    }

    echo "3. Probando PDO (lo que usa la app)...<br>";
    if (!class_exists('PDO')) {
        die("FALLA: La clase PDO no existe. Revisa el php.ini.");
    }
    
    $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
    echo "PDO OK. ¡Todo funciona!";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
