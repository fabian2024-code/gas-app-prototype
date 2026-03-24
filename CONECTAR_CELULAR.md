# Guía para Conectar tu Celular a la App

Para usar la aplicación en tu celular mientras el servidor está en tu computador, sigue estos pasos:

## 1. Conexión a la red
Ambos dispositivos (Computador y Celular) deben estar conectados a la **misma red Wi-Fi**.

> [!IMPORTANT]
> **NO UTILIZAR DATOS MÓVILES (4G/5G)**. Los datos móviles están en una red externa y no pueden "ver" tu computador. Debes activar el Wi-Fi en tu celular y conectarlo a la misma red que tu PC.

## 2. Obtener tu Dirección IP
En tu computador (Windows):
1.  Presiona la tecla **Windows + R**, escribe `cmd` y presiona Enter.
2.  Escribe el comando: `ipconfig` y presiona Enter.
3.  Busca la línea que dice **Dirección IPv4**. Será algo como: `192.168.1.XX`.

## 3. Acceder desde el Celular
Abre el navegador en tu celular (Chrome o Safari) y escribe la siguiente dirección:

👉 `http://TU_IP_AQUI/gas-app-prototype/index.html`

*(Ejemplo: http://192.168.1.15/gas-app-prototype/index.html)*

## 4. Solución de Problemas (Si falla)

Si ves un error de **"Conexión Abortada"** o **"No se puede acceder"**:

### A. Verificar Perfil de Red (MUY IMPORTANTE)
Si tu red está en "Pública", Windows bloquea al celular aunque apagues el firewall.
1. Haz clic en el icono de Wi-Fi en la barra de tareas.
2. Selecciona tu red y dale a **Propiedades**.
3. Asegúrate de que esté marcado **"Privada"**. Si dice "Pública", cámbialo a "Privada".

### B. ¿Tienes otro Antivirus?
Si tienes **Avast, AVG, ESET, Norton, Kaspersky o McAfee**, ellos tienen un firewall propio.
- **Debe estar desactivado** el firewall del antivirus también, o el celular no podrá entrar.

### C. Prueba de Oro (Red Alternativa)
Si nada funciona, podrías probar compartiendo internet desde tu propio celular al computador (Hotspot/Anclaje) y ver si ahí se ven. Esto descartaría si es el Router el que bloquea.

### C. Probar en el mismo computador
En tu computador, abre el navegador y escribe tu IP: `http://192.168.1.4/gas-app-prototype/index.html`.
- Si **NO CARGA** en el mismo computador: El problema es de XAMPP (Apache no está escuchando en esa IP).
- Si **SÍ CARGA** en el computador pero no en el celular: El problema es el Firewall o el Router bloqueando el paso.

### D. Aislamiento de AP (Router)
Algunos routers tienen una opción llamada "AP Isolation" o "Red de Invitados" que impide que el celular hable con el computador. Asegúrate de estar en la red principal.
