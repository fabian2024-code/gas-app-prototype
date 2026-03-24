-- SQL Script for GasControl Database
CREATE DATABASE IF NOT EXISTS gascontrol_db;
USE gascontrol_db;

-- Table for Products (Price and Stock)
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio INT NOT NULL,
    icono VARCHAR(50),
    descuento INT DEFAULT 0,
    stock_llenos INT DEFAULT 0,
    stock_vacios INT DEFAULT 0
);

-- Table for Clients
CREATE TABLE IF NOT EXISTS clientes (
    rut VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    cupones_disponibles INT DEFAULT 0
);

-- Table for Transactions (Sales)
CREATE TABLE IF NOT EXISTS transacciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rut_cliente VARCHAR(20),
    medio_pago VARCHAR(50),
    total_normal INT,
    total_descuento INT,
    total_final INT,
    coupon_codes TEXT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- FOREIGN KEY (rut_cliente) REFERENCES clientes(rut) -- Removed for guest sale flexibility
);

-- Table for Transaction Items (Detail)
CREATE TABLE IF NOT EXISTS transaccion_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaccion_id BIGINT,
    producto_id VARCHAR(50),
    cantidad INT,
    precio_unitario INT,
    FOREIGN KEY (transaccion_id) REFERENCES transacciones(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Initial Mock Data (Products)
INSERT IGNORE INTO productos (id, nombre, precio, icono, descuento, stock_llenos, stock_vacios) VALUES
('cil-5',  'Cilindro 5 Kg',  11500, 'fa-box',      2000, 10, 5),
('cil-11', 'Cilindro 11 Kg', 16500, 'fa-drum',     3500, 15, 8),
('cil-15', 'Cilindro 15 Kg', 23500, 'fa-oil-can',  5100, 20, 12),
('cil-45', 'Cilindro 45 Kg', 72000, 'fa-database', 8000, 5,  2),
('cil-al', 'Cilindro Alum.', 25000, 'fa-spray-can', 3000, 8,  3),
('otro',   'Regulador/Manguera', 8500, 'fa-wrench', 0,   10, 0);

-- Initial Mock Data (Clients)
INSERT IGNORE INTO clientes (rut, nombre, telefono, cupones_disponibles) VALUES
('12345678-9', 'Juan Perez',     '+56912345678', 2),
('98765432-1', 'Maria Gonzalez', '+56987654321', 1),
('11111111-1', 'Carlos Lopez',   '+56911111111', 2),
('VALE', 'Venta por Vale', '000', 0),
('DIRECTO', 'Venta Directa', '000', 0);
