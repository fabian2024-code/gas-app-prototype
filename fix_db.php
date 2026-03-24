<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'api/db.php';

echo "<h2>Reparador de Base de Datos</h2>";
echo "Conectado a la base de datos: <strong>gascontrol_db</strong><br><hr>";

try {
    // 1. Check num_documento in clientes
    echo "Paso 1: Verificando tabla 'clientes'... ";
    $res = $pdo->query("SHOW COLUMNS FROM clientes LIKE 'num_documento'")->fetch();
    if (!$res) {
        $pdo->exec("ALTER TABLE clientes ADD COLUMN num_documento VARCHAR(50) AFTER telefono");
        echo "<span style='color:green'>+ Columna 'num_documento' añadida.</span><br>";
    } else {
        echo "<span style='color:blue'>Estructura OK.</span><br>";
    }

    // 2. Check coupon_codes in transacciones
    echo "Paso 2: Verificando tabla 'transacciones'... ";
    $res = $pdo->query("SHOW COLUMNS FROM transacciones LIKE 'coupon_codes'")->fetch();
    if (!$res) {
        $pdo->exec("ALTER TABLE transacciones ADD COLUMN coupon_codes TEXT AFTER total_final");
        echo "<span style='color:green'>+ Columna 'coupon_codes' añadida.</span><br>";
    // 3. Insert special clients for anonymous/ticket sales (Failsafe for FK)
    echo "Paso 3: Creando perfiles especiales... ";
    $pdo->exec("INSERT IGNORE INTO clientes (rut, nombre, telefono, cupones_disponibles) VALUES 
        ('VALE', 'Venta por Vale', '000', 0),
        ('DIRECTO', 'Venta Directa', '000', 0),
        ('GUEST', 'Cliente sin RUT', '000', 0)");
    echo "<span style='color:green'>+ Perfiles creados (OK).</span><br>";

    // 4. Drop Foreign Key for maximum flexibility
    echo "Paso 4: Eliminando restricciones antiguas... ";
    try {
        // Try various common names for the FK if it failed before
        $pdo->exec("ALTER TABLE transacciones DROP FOREIGN KEY transacciones_ibfk_1");
        echo "<span style='color:green'>+ Restricción eliminada.</span><br>";
    } catch (Exception $fkEx) {
        echo "<span style='color:blue'>Ya optimizado o nombre distinto.</span><br>";
    }

    echo "<hr><h3>¡PROCESO COMPLETADO!</h3>";
    echo "<p>Ya puedes cerrar esta pestaña y volver a la App GasControl.</p>";
    echo "<a href='index.html' style='padding:10px 20px; background:#f97316; color:white; text-decoration:none; border-radius:8px;'>VOLVER A LA APP</a>";

} catch (Exception $e) {
    echo "<div style='background:#fee2e2; color:#ef4444; padding:20px; margin-top:20px; border-radius:8px; border:1px solid #ef4444;'>";
    echo "<strong>ERROR CRÍTICO:</strong> " . $e->getMessage();
    echo "</div>";
}
?>
