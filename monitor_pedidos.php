<?php
require_once 'api/db.php';
// Obtener todos los pedidos pendientes o en camino
$stmt = $pdo->query("SELECT * FROM pedidos_bot ORDER BY fecha_hora DESC LIMIT 50");
$pedidos = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monitor de Pedidos IA | GasControl</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #0a0a12; color: white; font-family: 'Outfit', sans-serif; }
        .monitor-container { max-width: 1000px; margin: 2rem auto; padding: 1rem; }
        .order-card { 
            background: rgba(255, 255, 255, 0.05); 
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 15px; 
            padding: 1.5rem; 
            margin-bottom: 1rem;
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .order-info h3 { margin: 0; color: #ffcc00; }
        .status-badge { 
            padding: 0.3rem 0.8rem; 
            border-radius: 20px; 
            font-size: 0.8rem; 
            font-weight: bold;
        }
        .status-Pendiente { background: #ff4444; }
        .status-En-camino { background: #33b5e5; }
        .status-Entregado { background: #00c851; color: white; }
        
        .action-btns { display: flex; gap: 10px; }
        .btn { 
            padding: 0.6rem 1rem; 
            border: none; 
            border-radius: 10px; 
            cursor: pointer; 
            font-weight: 600;
            transition: 0.3s;
        }
        .btn-dispatch { background: #33b5e5; color: white; }
        .btn-deliver { background: #00c851; color: white; }
        .btn:hover { opacity: 0.8; transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="monitor-container">
        <h1><i class="fas fa-satellite-dish"></i> Monitor de Pedidos IA</h1>
        <p>Gestiona las órdenes entrantes del chatbot en tiempo real.</p>
        
        <div id="orders-list">
            <?php foreach($pedidos as $p): ?>
                <div class="order-card" id="card-<?= $p['id'] ?>">
                    <div class="order-info">
                        <span class="status-badge status-<?= str_replace(' ', '-', $p['estado']) ?>"><?= $p['estado'] ?></span>
                        <h3><?= $p['producto'] ?></h3>
                        <p><i class="fas fa-map-marker-alt"></i> <?= $p['direccion'] ?></p>
                        <p><i class="fas fa-phone"></i> <?= $p['telefono'] ?></p>
                        <p><i class="fas fa-clock"></i> <?= date('H:i', strtotime($p['fecha_hora'])) ?></p>
                    </div>
                    
                    <div class="action-btns">
                        <?php if($p['estado'] === 'Pendiente'): ?>
                            <button class="btn btn-dispatch" onclick="updateStatus(<?= $p['id'] ?>, 'En camino')">
                                <i class="fas fa-truck-fast"></i> Despachar
                            </button>
                        <?php endif; ?>
                        
                        <?php if($p['estado'] !== 'Entregado' && $p['estado'] !== 'Cancelado'): ?>
                            <button class="btn btn-deliver" onclick="updateStatus(<?= $p['id'] ?>, 'Entregado')">
                                <i class="fas fa-check-circle"></i> Entregado
                            </button>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <script>
        function updateStatus(id, newStatus) {
            fetch('api/update_order_status.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, nuevo_estado: newStatus })
            })
            .then(r => r.json())
            .then(data => {
                if(data.success) {
                    location.reload(); // Recargar para ver cambios
                } else {
                    alert("Error: " + data.error);
                }
            })
            .catch(err => alert("Error de conexión"));
        }

        // Auto-refresco cada 30 segundos
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
