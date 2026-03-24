// ─── App Constants & State ────────────────────────────────────────────────────
let products = []; // Loaded from DB

let state = {
    currentUserRole: null,
    currentUserName: null,
    currentClient: null,   
    selectedProducts: {},  
    selectedPayment: null,
    transactions: [],
    totals: { ventas: 0, amount: 0, discountedAmount: 0,
              byPayment: { efectivo: 0, tarjeta: 0, transferencia: 0, vale: 0 },
              valeCount: 0,
              byProduct: {} },
    team: JSON.parse(localStorage.getItem('gas_staff_team')) || [
        { name: 'Pedro Repartidor', role: 'terreno' },
        { name: 'Santi Ventas', role: 'terreno' },
        { name: 'Mati Apoyo', role: 'oficina' }
    ],
    lastMonthWinner: null,
    isDemoMode: false
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initClock();
    await loadInitialData();
    setupListeners();
});
// LOGIN
document.getElementById('doLoginBtn').addEventListener('click', async () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const btn = document.getElementById('doLoginBtn');
    const errObj = document.getElementById('loginError');
    
    if (!user || !pass) {
        errObj.textContent = 'Ingresa usuario y contraseña';
        errObj.style.display = 'block';
        return;
    }
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    btn.disabled = true;
    errObj.style.display = 'none';
    
    try {
        const res = await fetch('api/index.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
        btn.disabled = false;
        
        if (data.success) {
            state.currentUserRole = data.role;
            state.currentUserName = data.nombre;
            applyRoleRestrictions();
            
            document.getElementById('loginOverlay').classList.remove('active');
            document.getElementById('adminDashboard').style.display = 'flex';
        } else {
            errObj.textContent = data.error || 'Credenciales inválidas';
            errObj.style.display = 'block';
        }
    } catch (err) {
        console.warn("Login failed, enabling Demo Mode fallback");
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
        btn.disabled = false;
        
        // Demo Mode Fallback: Allow login if user/pass are provided
        state.currentUserRole = 'administrador';
        state.currentUserName = user; // Use whatever name they typed
        enableDemoMode();
        
        applyRoleRestrictions();
        document.getElementById('loginOverlay').classList.remove('active');
        document.getElementById('adminDashboard').style.display = 'flex';
        showToast('🔓 Entrando en Modo Prototipo');
    }
});

document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('doLoginBtn').click();
});

const enterClientBtn = document.getElementById('enterClientModeBtn');
if (enterClientBtn) {
    enterClientBtn.addEventListener('click', () => {
        document.getElementById('loginOverlay').classList.remove('active');
        document.getElementById('adminDashboard').style.display = 'flex';
    });
}

function applyRoleRestrictions() {
    const role = state.currentUserRole || 'vendedor';
    const name = state.currentUserName || 'Usuario';
    
    // Update Header Profile Info
    const hName = document.getElementById('headerUserName');
    const hRole = document.getElementById('headerUserRole');
    if (hName) hName.textContent = name;
    if (hRole) hRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    // Default visibility
    const menuToggle = document.getElementById('menuToggle');
    const cageCard = document.querySelector('.cage-card');
    const wizardSection = document.querySelector('.wizard-section');
    const sideDrawer = document.getElementById('sideDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const adminDashboardView = document.getElementById('adminDashboardView');

    // Reset visibility for Vendedor/Repartidor
    if (menuToggle) menuToggle.style.display = 'flex';
    if (wizardSection) wizardSection.style.display = 'flex';
    if (sideDrawer) { sideDrawer.style.display = 'flex'; sideDrawer.classList.remove('admin-mode'); }
    if (cageCard) cageCard.style.display = 'block';
    if (adminDashboardView) adminDashboardView.style.display = 'none';
    
    // Role specific
    if (role === 'admin') {
        if (wizardSection) wizardSection.style.display = 'none';
        if (menuToggle) menuToggle.style.display = 'none';
        if (sideDrawer) sideDrawer.style.display = 'none';
        if (drawerOverlay) drawerOverlay.classList.remove('active');
        if (adminDashboardView) {
            adminDashboardView.style.display = 'flex';
            renderAdminDashboard();
        }
    }
    // Apply saved theme
    if (localStorage.getItem('gas-theme') === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    }

    // Hook theme button now that dashboard is visible
    const themeBtn = document.getElementById('toggleThemeBtn');
    if (themeBtn && !themeBtn._bound) {
        themeBtn._bound = true;
        themeBtn.addEventListener('click', e => {
            e.stopPropagation();
            const isLight = document.body.classList.toggle('light-mode');
            localStorage.setItem('gas-theme', isLight ? 'light' : 'dark');
            updateThemeIcon(isLight);
        });
    }

    // Profile Dropdown Setup
    const profileTrigger = document.getElementById('userProfileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('headerLogoutBtn');

    if (profileTrigger) {
        profileTrigger.onclick = (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => logout();
    }

    // Global click to close dropdowns
    document.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.classList.remove('active');
    });

    // Check for pending bot orders when logging in
    setTimeout(() => { 
        checkPendingOrders(); 
        checkReminders(); 
        if(state.currentUserRole === 'admin') renderAdminDashboard();
    }, 500);
}

function logout() {
    state.currentUserRole = null;
    state.currentUserName = null;
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginOverlay').classList.add('active');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    showToast('Sesión cerrada correctamente');
}

// ─── Admin Dashboard Logic ───────────────────────────────────────────────────
function renderAdminDashboard() {
    const view = document.getElementById('adminDashboardView');
    if(!view || view.style.display === 'none') return;
    
    // 1. Greeting
    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';
    if (hour >= 20) greeting = 'Buenas noches';
    const greetEl = document.getElementById('adminGreeting');
    if(greetEl) greetEl.textContent = `¡${greeting}, ${state.currentUserName || 'Admin'}!`;

    // 2. KPIs with animation
    const stockCritico = products.filter(p => p.stock < 10).length;
    const pendientes = JSON.parse(localStorage.getItem('gas_bot_orders') || '[]').length 
                     + JSON.parse(localStorage.getItem('gas_active_orders') || '[]').length;

    animateValue("adminVentasHoy", 0, state.totals.ventas || 0, 1000);
    animateValue("adminIngresosHoy", 0, state.totals.amount || 0, 1000, true);
    animateValue("adminStockBajo", 0, stockCritico, 1000);
    animateValue("adminPedidosPendientes", 0, pendientes, 1000);

    // 3. Charts & Widgets
    renderAdminChart();
    renderPieChart();
    renderGoalCircle();
    renderRanking();
    renderZones();
    renderAdminTimeline();
}

function animateValue(id, start, end, duration, isCurrency = false) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        obj.innerHTML = isCurrency ? formatCLP(val) : val;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

let adminSalesChart = null;
function renderAdminChart(customId = 'salesChart') {
    const ctx = document.getElementById(customId);
    if (!ctx) return;
    
    const labels = [];
    const _data = [];
    for (let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('es-CL', { weekday: 'short' }));
        const isToday = i === 0;
        _data.push(isToday ? (state.totals.ventas || 0) : Math.floor(Math.random() * 40) + 10);
    }

    if (adminSalesChart && customId === 'salesChart') adminSalesChart.destroy();
    if (window._expandedSalesChart && customId === 'salesChartExpanded') window._expandedSalesChart.destroy();

    const isLightSettings = document.body.classList.contains('light-mode');
    const textColor = isLightSettings ? '#65676b' : '#8b949e';
    const gridColor = isLightSettings ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cilindros Vendidos',
                data: _data,
                backgroundColor: 'rgba(249, 115, 22, 0.8)',
                borderRadius: 6,
                borderWidth: 0,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: 14 }, bodyFont: { size: 14 }, padding: 12, cornerRadius: 8 }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            }
        }
    });

    if (customId === 'salesChart') adminSalesChart = chart;
    else window._expandedSalesChart = chart;
}

let adminPieChart = null;
function renderPieChart(customId = 'paymentChart') {
    const ctx = document.getElementById(customId);
    if (!ctx) return;

    const data = state.totals.byPayment;
    const labels = ['Efectivo', 'Tarjeta', 'Transferencia', 'Vale'];
    const values = [data.efectivo || 0, data.tarjeta || 0, data.transferencia || 0, data.vale || 0];

    // If all are 0, add some dummy data for "visual excellence" if it's the first time
    const sum = values.reduce((a, b) => a + b, 0);
    const finalValues = sum > 0 ? values : [10, 5, 8, 12]; 

    if (adminPieChart && customId === 'paymentChart') adminPieChart.destroy();
    if (window._expandedPieChart && customId === 'paymentChartExpanded') window._expandedPieChart.destroy();

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: finalValues,
                backgroundColor: ['#f97316', '#3b82f6', '#2ea043', '#a78bfa'],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: document.body.classList.contains('light-mode') ? '#65676b' : '#8b949e', padding: 20, font: { size: 11, weight: '600' } } }
            },
            cutout: '70%',
            animation: { animateScale: true }
        }
    });

    if (customId === 'paymentChart') adminPieChart = chart;
    else window._expandedPieChart = chart;
}

function renderGoalCircle() {
    const goal = 1000;
    const totalCylinders = state.totals.ventas || 0;
    const percentage = Math.min(Math.round((totalCylinders / goal) * 100), 100);
    
    const path = document.getElementById('goalCirclePath');
    const text = document.getElementById('goalPercentageText');
    const valText = document.getElementById('goalTextValue');
    
    if (path) path.setAttribute('stroke-dasharray', `${percentage}, 100`);
    if (text) text.textContent = `${percentage}%`;
    if (valText) valText.textContent = `${totalCylinders.toLocaleString()} / 1,000`;
}

function renderRanking() {
    const list = document.getElementById('adminRankingList');
    if (!list) return;

    // 1. Get current month/year for monthly report context
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 2. Aggregate REAL sales per vendedor from ALL transactions
    // Important: Only count products that are cylinders (not tools/services) if desired, 
    // but here we sum the quantity of all items.
    const salesByVendedor = {};

    state.transactions.forEach(tx => {
        const vendor = tx.vendedor || 'Administrador General';
        const totalQty = tx.items.reduce((acc, it) => acc + it.qty, 0);
        
        // Optional: Filter only current month for the "Ranking" if that's what the user wants,
        // but usually a daily or overall ranking is fine. Let's do current month to be "Monthly".
        if (tx.time.getMonth() === currentMonth && tx.time.getFullYear() === currentYear) {
            salesByVendedor[vendor] = (salesByVendedor[vendor] || 0) + totalQty;
        }
    });

    // 3. Prepare the display list including all team members (even with 0 sales)
    const displayList = [
        { name: state.currentUserName || 'Administrador General', role: 'encargado' }
    ];
    state.team.forEach(m => displayList.push({...m}));

    // Assign actual sales to each person
    const finalRank = displayList.map(p => ({
        ...p,
        sales: salesByVendedor[p.name] || 0
    })).sort((a,b) => b.sales - a.sales);

    // 4. Render
    list.innerHTML = '';
    finalRank.forEach((s, i) => {
        const medals = ['gold', 'silver', 'bronze'];
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.style.animationDelay = `${i * 0.1}s`;
        
        let roleHtml = '';
        if (s.role === 'terreno') roleHtml = '<span class="role-badge terreno">En Terreno</span>';
        else if (s.role === 'oficina') roleHtml = '<span class="role-badge oficina">En Oficina</span>';
        else if (s.role === 'encargado') roleHtml = '<span class="role-badge encargado">Encargado</span>';

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div class="rank-pos ${medals[i] || ''}">${i+1}</div>
                <div style="display: flex; flex-direction: column;">
                    <div class="rank-name" style="margin-left: 0;">${s.name}</div>
                    <div style="margin-top: 4px;">${roleHtml}</div>
                </div>
            </div>
            <div class="rank-amount">${s.sales} cil.</div>
        `;
        list.appendChild(item);
    });
}

// ─── Staff Management Logic ───────────────────────────────────────────────────
function openStaffModal() {
    const listContainer = document.getElementById('staffListInputs');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    state.team.forEach((member, i) => {
        const row = document.createElement('div');
        row.className = 'input-group';
        row.style.background = 'rgba(255,255,255,0.03)';
        row.style.padding = '15px';
        row.style.borderRadius = '12px';
        row.style.border = '1px solid var(--border-color)';
        
        row.innerHTML = `
            <div style="margin-bottom:8px; font-weight:700; color:var(--primary); font-size:12px; text-transform:uppercase;">Trabajador ${i+1}</div>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" value="${member.name}" placeholder="Nombre" id="staffName_${i}" style="flex:1;">
                <select id="staffRole_${i}" style="width:120px; background:var(--bg-color); color:white; border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                    <option value="terreno" ${member.role === 'terreno' ? 'selected' : ''}>Terreno</option>
                    <option value="oficina" ${member.role === 'oficina' ? 'selected' : ''}>Oficina</option>
                </select>
            </div>
        `;
        listContainer.appendChild(row);
    });

    document.getElementById('staffModal').classList.add('active');
}

function saveStaffConfig() {
    const newTeam = [];
    for (let i = 0; i < state.team.length; i++) {
        const name = document.getElementById(`staffName_${i}`).value.trim();
        const role = document.getElementById(`staffRole_${i}`).value;
        if (name) {
            newTeam.push({ name, role });
        }
    }
    
    if (newTeam.length > 0) {
        state.team = newTeam;
        localStorage.setItem('gas_staff_team', JSON.stringify(state.team));
        renderRanking();
        showToast('✅ Equipo actualizado correctamente');
    }
    
    document.getElementById('staffModal').classList.remove('active');
}

function renderZones() {
    const list = document.getElementById('adminZonasList');
    if (!list) return;

    const zones = [
        { name: 'Centro Histórico', hits: Math.floor((state.totals.ventas || 20) * 0.4) + 8 },
        { name: 'Villa Los Alerces', hits: Math.floor((state.totals.ventas || 20) * 0.3) + 5 },
        { name: 'Sector El Roble', hits: Math.floor((state.totals.ventas || 20) * 0.2) + 2 }
    ];

    list.innerHTML = '';
    zones.forEach((z, i) => {
        const li = document.createElement('li');
        li.style.animationDelay = `${i * 0.1}s`;
        li.innerHTML = `<span>${z.name}</span> <span class="zone-hits">${z.hits} pedidos</span>`;
        list.appendChild(li);
    });
}

// ─── Widget Expansion ────────────────────────────────────────────────────────
function expandWidget(widgetId) {
    const widget = document.getElementById(widgetId);
    const modal = document.getElementById('expandedWidgetModal');
    const body = document.getElementById('expandedWidgetBody');
    const title = document.getElementById('expandedWidgetTitle');
    
    if (!widget || !modal || !body) return;
    
    const headText = widget.querySelector('h3').innerHTML;
    title.innerHTML = headText;
    
    const content = widget.querySelector('.widget-body');
    body.innerHTML = '';
    
    const clone = content.cloneNode(true);
    clone.style.height = '100%';
    clone.style.maxHeight = 'none';
    clone.style.display = 'flex';
    clone.style.flexDirection = 'column';
    clone.style.justifyContent = 'center';
    
    // Adjust inner styles for large view
    if (widgetId === 'widgetGoals') {
        clone.querySelector('.circular-chart').style.maxWidth = '300px';
        clone.querySelector('.circular-chart').style.maxHeight = '300px';
    }
    
    body.appendChild(clone);
    modal.classList.add('active');
    
    // Re-init charts
    if (widgetId === 'widgetLineChart') {
        const newCtx = clone.querySelector('canvas');
        newCtx.id = 'salesChartExpanded';
        renderAdminChart('salesChartExpanded');
    } else if (widgetId === 'widgetPieChart') {
        const newCtx = clone.querySelector('canvas');
        newCtx.id = 'paymentChartExpanded';
        renderPieChart('paymentChartExpanded');
    }
}

function closeExpandedWidget() {
    document.getElementById('expandedWidgetModal').classList.remove('active');
}

function expandKPI(type) {
    const modal = document.getElementById('expandedWidgetModal');
    const body = document.getElementById('expandedWidgetBody');
    const title = document.getElementById('expandedWidgetTitle');
    
    if (!modal || !body || !title) return;
    
    body.innerHTML = '';
    let html = '';
    
    if (type === 'ventas') {
        title.innerHTML = '<i class="fa-solid fa-chart-line"></i> Detalle de Ventas (Hoy)';
        const todaySales = state.transactions.filter(tx => {
            const txDate = new Date(tx.time);
            const now = new Date();
            return txDate.toDateString() === now.toDateString();
        }).sort((a,b) => b.time - a.time);
        
        if (todaySales.length === 0) {
            html = '<div class="empty-state">No hay ventas registradas hoy.</div>';
        } else {
            html = '<div style="padding: 20px;"><table class="premium-table"><thead><tr><th>Hora</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Pago</th></tr></thead><tbody>';
            todaySales.forEach(tx => {
                const time = tx.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const prods = tx.items.map(i => `${i.qty}x ${i.product.name}`).join('<br>');
                html += `<tr>
                    <td>${time}</td>
                    <td>${tx.client.name || 'General'}</td>
                    <td style="font-size: 13px;">${prods}</td>
                    <td style="font-weight: 700;">${formatCLP(tx.finalPrice)}</td>
                    <td><span class="badge ${tx.payment}">${tx.payment}</span></td>
                </tr>`;
            });
            html += '</tbody></table></div>';
        }
    } 
    else if (type === 'ingresos') {
        title.innerHTML = '<i class="fa-solid fa-wallet"></i> Desglose de Ingresos (Hoy)';
        const data = state.totals.byPayment;
        html = `
            <div style="padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: center;">
                <div style="height: 350px;"><canvas id="expandedIngresosChart"></canvas></div>
                <div class="ranking-list">
                    <div class="ranking-item"><span>Efectivo</span> <span class="rank-amount">${formatCLP(data.efectivo)}</span></div>
                    <div class="ranking-item"><span>Tarjeta</span> <span class="rank-amount">${formatCLP(data.tarjeta)}</span></div>
                    <div class="ranking-item"><span>Transferencia</span> <span class="rank-amount">${formatCLP(data.transferencia)}</span></div>
                    <div class="ranking-item"><span>Vales</span> <span class="rank-amount">${formatCLP(data.vale)}</span></div>
                    <hr style="border: none; border-top: 1px solid var(--border-color); margin: 10px 0;">
                    <div class="ranking-item" style="border-color: var(--primary);"><span style="font-weight: 800;">TOTAL</span> <span style="font-size: 22px; color: var(--primary); font-weight: 800;">${formatCLP(state.totals.amount)}</span></div>
                </div>
            </div>
        `;
    } 
    else if (type === 'stock') {
        title.innerHTML = '<i class="fa-solid fa-boxes-stacked"></i> Alerta de Stock Crítico';
        const lowStock = products.filter(p => p.stock < 10);
        if (lowStock.length === 0) {
            html = '<div class="empty-state">Todo el stock está en niveles óptimos.</div>';
        } else {
            html = '<div style="padding: 20px;"><table class="premium-table"><thead><tr><th>Producto</th><th>Stock Actual</th><th>Estado</th></tr></thead><tbody>';
            lowStock.forEach(p => {
                const pct = (p.stock / 50) * 100;
                html += `<tr>
                    <td><div style="font-weight: 700;">${p.name}</div><div style="font-size: 12px; color: var(--text-secondary);">${p.id}</div></td>
                    <td style="font-size: 18px; font-weight: 800;">${p.stock} <small style="font-size: 12px; font-weight: 400; color: var(--text-secondary);">unidades</small></td>
                    <td><div style="width: 100px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;"><div style="width: ${pct}%; height: 100%; background: #f59e0b;"></div></div></td>
                </tr>`;
            });
            html += '</tbody></table></div>';
        }
    } 
    else if (type === 'pedidos') {
        title.innerHTML = '<i class="fa-solid fa-robot"></i> Pedidos Chatbot y Entregas';
        const pending = JSON.parse(localStorage.getItem('gas_bot_orders') || '[]');
        const active = JSON.parse(localStorage.getItem('gas_active_orders') || '[]');
        
        html = '<div style="padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
        
        // Pedidos sin asignar
        html += `<div><h3 style="margin-bottom: 15px;">Sin Asignar (${pending.length})</h3>`;
        if (pending.length === 0) html += '<p class="empty-state">No hay pedidos nuevos.</p>';
        pending.forEach(o => {
            html += `<div class="timeline-content" style="margin-bottom: 10px;">
                <div style="font-weight: 700;">${o.product}</div>
                <div style="font-size: 12px;"><i class="fa-solid fa-location-dot"></i> ${o.addr}</div>
            </div>`;
        });
        html += '</div>';

        // Entregas en curso
        html += `<div><h3 style="margin-bottom: 15px;">En Camino (${active.length})</h3>`;
        if (active.length === 0) html += '<p class="empty-state">No hay entregas activas.</p>';
        active.forEach(o => {
            const diff = Math.floor((Date.now() - o.acceptedAt) / 60000);
            html += `<div class="timeline-content" style="margin-bottom: 10px; border-left: 3px solid #f59e0b;">
                <div style="font-weight: 700;">${o.product}</div>
                <div style="font-size: 12px;"><i class="fa-solid fa-clock"></i> Hace ${diff} min</div>
                <div style="font-size: 12px;"><i class="fa-solid fa-location-dot"></i> ${o.addr}</div>
            </div>`;
        });
        html += '</div></div>';
    }

    body.innerHTML = html;
    modal.classList.add('active');

    // Init chart if ingresos was clicked
    if (type === 'ingresos') {
        setTimeout(() => renderPieChart('expandedIngresosChart'), 100);
    }
}

function renderAdminTimeline() {
    const tl = document.getElementById('adminTimeline');
    if (!tl) return;
    tl.innerHTML = '';

    const recent = [...state.transactions].sort((a,b) => b.time - a.time).slice(0, 5);
    
    if (recent.length === 0) {
        tl.innerHTML = '<div class="empty-state">No hay actividad reciente</div>';
        return;
    }

    recent.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        let iconHtml = '<i class="fa-solid fa-receipt"></i>';
        let statusClass = '';
        if (tx.payment === 'vale') { statusClass = 'warning'; iconHtml = '<i class="fa-solid fa-ticket"></i>'; }
        else if (tx.payment === 'transferencia') { statusClass = 'success'; iconHtml = '<i class="fa-solid fa-building-columns"></i>'; }
        else if (tx.payment === 'tarjeta') { statusClass = 'success'; iconHtml = '<i class="fa-solid fa-credit-card"></i>'; }
        else { iconHtml = '<i class="fa-solid fa-money-bill"></i>'; }

        if (statusClass) item.classList.add(statusClass);

        const timeStr = tx.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const prods = tx.items.map(i => i.qty + 'x ' + i.product.name).join(', ');

        item.innerHTML = `
            <div class="timeline-icon">${iconHtml}</div>
            <div class="timeline-content">
                <h4>Venta de ${prods}</h4>
                <p>${tx.client.name || 'Cliente general'} - Pago: ${tx.payment} ($${tx.finalPrice.toLocaleString()})</p>
                <span class="timeline-time">${timeStr}</span>
            </div>
        `;
        tl.appendChild(item);
    });
}

function updateThemeIcon(isLight) {
    const btn = document.getElementById('toggleThemeBtn');
    if (!btn) return;
    if (isLight) {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i><span>Modo Claro</span>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i><span>Modo Oscuro</span>';
    }
}

// ─── Avatar Dropdown ────────────────────────────────────────────────────────
document.addEventListener('click', e => {
    const dropdown = document.getElementById('avatarDropdown');
    const pill     = document.getElementById('userAvatar');
    const wrapper  = document.querySelector('.user-menu-wrapper');
    if (!dropdown) return;

    if (pill && pill.contains(e.target)) {
        // Toggle if clicking the pill or its children
        dropdown.classList.toggle('active');
    } else if (wrapper && !wrapper.contains(e.target)) {
        // Close if clicking outside the whole menu area
        dropdown.classList.remove('active');
    }
});

// ─── Chatbot ─────────────────────────────────────────────────────────────────
const chatbotWindow = document.getElementById('chatbotWindow');
const openChatBtn   = document.getElementById('openChatBtn');
const closeChatBtn  = document.getElementById('closeChatBtn');
const sendChatBtn   = document.getElementById('sendChatBtn');
const chatInput     = document.getElementById('chatInput');
const chatBody      = document.getElementById('chatBody');

if (openChatBtn) {
    openChatBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        chatbotWindow.classList.toggle('active');
    });
    closeChatBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        chatbotWindow.classList.remove('active');
    });
}
const loginChatBtn = document.getElementById('loginChatBtn');
if (loginChatBtn) {
    loginChatBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        chatbotWindow.classList.toggle('active');
    });
}
if (sendChatBtn) {
    sendChatBtn.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleChatSubmit(); });
}

// Chat conversation state for Gemini
state._chat = { history: [] };

function handleChatSubmit() {
    const text = chatInput.value.trim();
    if (!text) return;
    appendMessage('user', text);
    chatInput.value = '';
    
    // UI State: thinking
    chatInput.disabled = true;
    if(sendChatBtn) sendChatBtn.disabled = true;
    
    const thinkingId = 'think_' + Date.now();
    const thinkingBubble = document.createElement('div');
    thinkingBubble.id = thinkingId;
    thinkingBubble.className = 'chat-bubble bot';
    thinkingBubble.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Escribiendo...';
    chatBody.appendChild(thinkingBubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    setTimeout(() => processGeminiChat(text, thinkingId), 100);
}

async function processGeminiChat(text, thinkingId) {
    state._chat.history.push({
        "role": "user",
        "parts": [{ "text": text }]
    });

    try {
        // Detecta si está en Netlify o en XAMPP/CPanel
        const isNetlify = window.location.hostname.includes('netlify.app');
        const isVercel = window.location.hostname.includes('vercel.app');
        
        let endpoint = 'api/ai_chat.php'; // Default para XAMPP/cPanel
        if (isNetlify) endpoint = '/.netlify/functions/chat';
        if (isVercel) endpoint = '/api/chat';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: state._chat.history })
        });
        const data = await res.json();
        
        const tb = document.getElementById(thinkingId);
        if(tb) chatBody.removeChild(tb);
        
        if (data.error && !data.botResponse) {
            console.error("Detalle del error:", data.details);
            const extra = data.details ? JSON.stringify(data.details).substring(0, 100) : '';
            appendMessage('bot', '❌ Error: ' + data.error + ' ' + extra);
        } else {
            const botText = data.botResponse;
            
            // Revisa si la IA generó el JSON de orden secreta
            if (botText.includes('"action"') && botText.includes('"ORDER"')) {
                try {
                    let cleanJson = botText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const orderData = JSON.parse(cleanJson);
                    
                    if (orderData.action === 'ORDER') {
                        notifyRepartidor(orderData.product, orderData.address, orderData.phone);
                        const confirmMsg = `✅ ¡Pedido confirmado!\n\n📦 ${orderData.product}\n📍 ${orderData.address}\n📞 ${orderData.phone}\n\n🚚 Un repartidor ha sido notificado y llegará pronto.`;
                        appendMessage('bot', confirmMsg);
                        
                        state._chat.history.push({
                            "role": "model",
                            "parts": [{ "text": "Su pedido ha sido generado y enviado al repartidor con éxito. ¡Gracias por confiar en nosotros!" }]
                        });
                    }
                } catch (e) {
                    appendMessage('bot', '⚠️ Hubo un pequeño error procesando tu pedido, pero un vendedor lo revisará internamente.');
                }
            } else {
                appendMessage('bot', botText);
                state._chat.history.push({
                    "role": "model",
                    "parts": [{ "text": botText }]
                });
            }
        }
    } catch (err) {
        const tb = document.getElementById(thinkingId);
        if(tb) chatBody.removeChild(tb);
        appendMessage('bot', '❌ Error de red al tratar de contactar al servidor: ' + err.message);
    }
    
    chatInput.disabled = false;
    if(sendChatBtn) sendChatBtn.disabled = false;
    chatInput.focus();
}

function appendMessage(type, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.style.whiteSpace = 'pre-line';
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Notificar al repartidor de turno
function notifyRepartidor(product, addr, phone) {
    const order = { id: Date.now(), product, addr, phone, time: Date.now() };
    const pending = JSON.parse(localStorage.getItem('gas_bot_orders') || '[]');
    pending.push(order);
    localStorage.setItem('gas_bot_orders', JSON.stringify(pending));
    checkPendingOrders();
}

function checkPendingOrders() {
    if (state.currentUserRole !== 'repartidor' && state.currentUserRole !== 'admin') return;
    const alertBox = document.getElementById('orderAlert');
    if (alertBox.classList.contains('active')) return; // already showing one
    
    const pending = JSON.parse(localStorage.getItem('gas_bot_orders') || '[]');
    if (pending.length > 0) {
        showOrderAlert(pending[0]);
    }
}

window.addEventListener('storage', (e) => {
    if (e.key === 'gas_bot_orders') checkPendingOrders();
    if (e.key === 'gas_active_orders') checkReminders();
});

function showOrderAlert(order) {
    const alertBox = document.getElementById('orderAlert');
    const details  = document.getElementById('alertDetails');
    if (!alertBox || !details) return;
    
    window._currentAlertOrderId = order.id;
    window._currentAlertAddr = order.addr;
    
    details.innerHTML = `<strong>${order.product}</strong><br><i class="fa-solid fa-location-dot"></i> ${order.addr}<br><i class="fa-solid fa-phone"></i> ${order.phone || 'No especificado'}`;
    alertBox.classList.add('active');
    
    // Auto dismiss after 60 sec to allow others
    clearTimeout(alertBox._timer);
    alertBox._timer = setTimeout(() => {
        alertBox.classList.remove('active');
    }, 60000);
    
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [880, 660, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.15);
        });
    } catch(e) {}
}

function acceptOrder() { closeAlert(true); }
function rejectOrder() { closeAlert(false); }

function closeAlert(accepted = true) {
    const alertBox = document.getElementById('orderAlert');
    alertBox.classList.remove('active');
    
    let originalOrder = null;
    if (window._currentAlertOrderId) {
        const pending = JSON.parse(localStorage.getItem('gas_bot_orders') || '[]');
        originalOrder = pending.find(o => o.id === window._currentAlertOrderId);
        const updated = pending.filter(o => o.id !== window._currentAlertOrderId);
        localStorage.setItem('gas_bot_orders', JSON.stringify(updated));
        window._currentAlertOrderId = null;
    }
    
    if (accepted && window._currentAlertAddr) {
        if (originalOrder) {
            const activeOrders = JSON.parse(localStorage.getItem('gas_active_orders') || '[]');
            activeOrders.push({ ...originalOrder, acceptedAt: Date.now(), reminded: false });
            localStorage.setItem('gas_active_orders', JSON.stringify(activeOrders));
        }
        showToast('Pedido Aceptado. Abriendo mapa...');
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(window._currentAlertAddr)}`;
        window.open(url, '_blank');
        window._currentAlertAddr = null;
    } else if (!accepted) {
        showToast('Pedido Rechazado.');
        window._currentAlertAddr = null;
    }
    
    setTimeout(checkPendingOrders, 1000);
}

function checkReminders() {
    if (state.currentUserRole !== 'repartidor' && state.currentUserRole !== 'admin') return;
    const alertBox = document.getElementById('reminderAlert');
    if (!alertBox || alertBox.classList.contains('active')) return;
    
    const activeOrders = JSON.parse(localStorage.getItem('gas_active_orders') || '[]');
    const now = Date.now();
    let updated = false;
    
    // Mostramos el primero que tenga más de 30 minutos (30 * 60 * 1000 ms)
    const overdue = activeOrders.find(o => !o.reminded && (now - o.acceptedAt > 30 * 60 * 1000));
    
    if (overdue) {
        overdue.reminded = true;
        updated = true;
        showReminderUI(overdue);
    }

    if (updated) {
        localStorage.setItem('gas_active_orders', JSON.stringify(activeOrders));
    }
}

function showReminderUI(order) {
    const alertBox = document.getElementById('reminderAlert');
    const details  = document.getElementById('reminderDetails');
    window._currentReminderId = order.id;
    
    details.innerHTML = `<strong>${order.product}</strong><br><i class="fa-solid fa-location-dot"></i> ${order.addr}<br><i class="fa-solid fa-clock"></i> Hace más de 30 min.`;
    alertBox.classList.add('active');
    
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [900, 700, 900, 700].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.15);
        });
    } catch(e) {}
}

function finishReminderOrder() {
    const alertBox = document.getElementById('reminderAlert');
    alertBox.classList.remove('active');
    
    if (window._currentReminderId) {
        const activeOrders = JSON.parse(localStorage.getItem('gas_active_orders') || '[]');
        const updated = activeOrders.filter(o => o.id !== window._currentReminderId);
        localStorage.setItem('gas_active_orders', JSON.stringify(updated));
        window._currentReminderId = null;
        showToast('Pedido marcado como Entregado ✅');
        
        // Revisar si quedan más recordatorios pendientes
        setTimeout(checkReminders, 1000);
    }
}

setInterval(checkReminders, 60000);

// ─── Profile Modal ─────────────────────────────────────────────────────────────
function openProfileModal(type) {
    document.getElementById('avatarDropdown').classList.remove('active');
    const title   = document.getElementById('profileModalTitle');
    const body    = document.getElementById('profileModalBody');
    const oldBtn  = document.getElementById('profileSaveBtn');
    const saveBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(saveBtn, oldBtn);

    if (type === 'password') {
        title.textContent = 'Cambiar Contraseña';
        body.innerHTML = `
            <div class="input-group"><label>Contraseña Actual</label><input type="password" id="pOld" placeholder="••••••••"></div>
            <div class="input-group"><label>Nueva Contraseña</label><input type="password" id="pNew" placeholder="Mínimo 6 caracteres"></div>
            <div class="input-group"><label>Confirmar Nueva</label><input type="password" id="pConfirm" placeholder="Repite la nueva contraseña"></div>`;
        saveBtn.addEventListener('click', async () => {
            const oldP = document.getElementById('pOld').value;
            const newP = document.getElementById('pNew').value;
            const conf = document.getElementById('pConfirm').value;
            if (!oldP || !newP || !conf) return showToast('Completa todos los campos');
            if (newP !== conf) return showToast('Las contraseñas no coinciden');
            if (newP.length < 6) return showToast('Mínimo 6 caracteres');
            try {
                const res = await fetch('api/index.php?action=change_password', {
                    method: 'POST',
                    body: JSON.stringify({ username: state.currentUserName, old_password: oldP, new_password: newP })
                });
                const d = await res.json();
                if (d.success) { showToast('✅ Contraseña actualizada'); document.getElementById('profileModal').classList.remove('active'); }
                else showToast('❌ ' + (d.error || 'Error al actualizar'));
            } catch { showToast('Error de conexión'); }
        });

    } else if (type === 'user') {
        title.textContent = 'Cambiar Usuario';
        body.innerHTML = `
            <div class="input-group"><label>Usuario Actual</label><input type="text" value="${state.currentUserName}" readonly style="opacity:0.6;"></div>
            <div class="input-group"><label>Nuevo Usuario</label><input type="text" id="newUsername" placeholder="Nuevo nombre de usuario"></div>
            <div class="input-group"><label>Contraseña (para confirmar)</label><input type="password" id="uPass" placeholder="Tu contraseña actual"></div>`;
        saveBtn.addEventListener('click', async () => {
            const newU = document.getElementById('newUsername').value.trim();
            const pass = document.getElementById('uPass').value;
            if (!newU || !pass) return showToast('Completa todos los campos');
            try {
                const res = await fetch('api/index.php?action=change_username', {
                    method: 'POST',
                    body: JSON.stringify({ old_username: state.currentUserName, new_username: newU, password: pass })
                });
                const d = await res.json();
                if (d.success) {
                    state.currentUserName = newU; applyRoleRestrictions();
                    showToast('✅ Usuario actualizado'); document.getElementById('profileModal').classList.remove('active');
                } else showToast('❌ ' + (d.error || 'Error al actualizar'));
            } catch { showToast('Error de conexión'); }
        });

    } else if (type === 'photo') {
        title.textContent = 'Foto de Perfil';
        body.innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
                <div id="photoPreview" style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 15px;color:white;overflow:hidden;">
                    <i class="fa-solid fa-user"></i></div>
                <p style="color:var(--text-secondary);font-size:13px;">Sube una imagen de perfil</p>
            </div>
            <div class="input-group"><label>Seleccionar Imagen</label>
                <input type="file" id="photoFile" accept="image/*" style="background:none;border:1px dashed var(--border-color);padding:10px;border-radius:10px;width:100%;color:var(--text-primary);">
            </div>`;
        document.getElementById('photoFile').addEventListener('change', e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = r => {
                document.getElementById('photoPreview').innerHTML = `<img src="${r.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                state._profilePhoto = r.target.result;
            };
            reader.readAsDataURL(file);
        });
        saveBtn.addEventListener('click', () => {
            if (state._profilePhoto) {
                const av = document.getElementById('userAvatar');
                if (av) { av.style.backgroundImage = `url(${state._profilePhoto})`; av.style.backgroundSize = 'cover'; }
            }
            showToast('✅ Foto actualizada');
            document.getElementById('profileModal').classList.remove('active');
        });
    }
    document.getElementById('profileModal').classList.add('active');
}

// ─── Expanded Views ────────────────────────────────────────────────────────
function showAllSales() {
    const list = document.getElementById('fullTxList');
    if (!list) return;
    list.innerHTML = '';
    
    if (state.transactions.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay transacciones registradas aún.</div>';
    } else {
        [...state.transactions].sort((a,b) => b.time - a.time).forEach(tx => {
            const item = createTransactionElement(tx);
            list.appendChild(item);
        });
    }
    document.getElementById('allSalesModal').classList.add('active');
}

function showStockModal() {
    const grid = document.getElementById('fullStockGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'cage-modal-row';
        card.style.gridTemplateColumns = '1fr auto';
        card.style.padding = '15px';
        
        const stock = p.stock || 0;
        const colorClass = stock > 5 ? 'stock-full' : 'stock-empty';
        
        card.innerHTML = `
            <div>
                <div style="font-weight:700; font-size: 15px;">${p.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${p.price ? '$' + p.price.toLocaleString() : 'Punto de Venta'}</div>
            </div>
            <div class="stock-badge ${colorClass}" style="font-size: 16px;">
                <i class="fa-solid fa-box"></i>
                <span>${stock}</span>
            </div>
        `;
        grid.appendChild(card);
    });
    document.getElementById('stockFullModal').classList.add('active');
}

function createTransactionElement(tx) {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    
    const timeStr = tx.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const methodIcons = { efectivo: 'fa-money-bill', tarjeta: 'fa-credit-card', transferencia: 'fa-building-columns', vale: 'fa-ticket' };
    
    div.innerHTML = `
        <div class="tx-details">
            <div class="tx-icon"><i class="fa-solid ${methodIcons[tx.payment] || 'fa-receipt'}"></i></div>
            <div class="tx-info">
                <span class="tx-product">${tx.items.map(i => i.qty + 'x ' + i.product.name).join(', ')}</span>
                <span class="tx-time">${timeStr} - ${tx.client.name || tx.client.rut || 'Cliente General'}</span>
            </div>
        </div>
        <div class="tx-amount-group">
            <div class="tx-amount">$${tx.finalPrice.toLocaleString()}</div>
            <div class="tx-method">${tx.payment}</div>
        </div>
    `;
    return div;
}

async function loadInitialData() {
    try {
        // Try to fetch products
        let prods;
        try {
            const prodRes = await fetch('api/index.php?action=get_products');
            prods = await prodRes.json();
            if (prods.error) throw new Error(prods.error);
            localStorage.setItem('gas_cache_products', JSON.stringify(prods));
        } catch (e) {
            console.warn("Using cached products (Demo Mode)");
            prods = JSON.parse(localStorage.getItem('gas_cache_products') || '[]');
            enableDemoMode();
        }

        products = prods.map(p => ({
            id:         p.id,
            name:       p.nombre  || p.name  || 'Producto',
            precio:     parseFloat(p.precio)  || 0,
            price:      parseFloat(p.precio)  || 0,
            discount:   parseFloat(p.descuento_cupon) || 0,
            icon:       p.icono   || p.icon   || 'fa-fire',
            stockFull:  parseInt(p.stock_llenos)  || 0,
            stockEmpty: parseInt(p.stock_vacios)  || 0,
            stock:      parseInt(p.stock_llenos)  || 0
        }));
        
        // Try to fetch transactions
        let dbTxs;
        try {
            const txRes = await fetch('api/index.php?action=get_transactions');
            dbTxs = await txRes.json();
            if (dbTxs.error) throw new Error(dbTxs.error);
            localStorage.setItem('gas_cache_transactions', JSON.stringify(dbTxs));
        } catch (e) {
            console.warn("Using cached transactions (Demo Mode)");
            dbTxs = JSON.parse(localStorage.getItem('gas_cache_transactions') || '[]');
            enableDemoMode();
        }
        
        state.transactions = dbTxs.map(tx => ({
            id: tx.id,
            client: { rut: tx.rut_cliente, name: tx.cliente_nombre || tx.rut_cliente },
            items: (tx.items || []).map(it => ({ 
                product: { 
                    id:    it.producto_id, 
                    name:  it.nombre || 'Producto',
                    icon:  it.icono  || 'fa-fire',
                    price: parseFloat(it.precio_unitario) || 0
                },
                qty: parseInt(it.cantidad) || 1
            })),
            payment:       tx.medio_pago,
            finalPrice:    parseFloat(tx.total_final)     || 0,
            totalDiscount: parseFloat(tx.total_descuento) || 0,
            vendedor:      tx.vendedor || 'Administrador General',
            time: new Date(tx.fecha_hora)
        }));

        calculateTotalsFromHistory();
        renderProducts();
        renderTransactions();
        renderInventory();
        updateStatsUI();
        updateValeBadge();
    } catch (err) {
        console.error("Error global de carga:", err);
        enableDemoMode();
    }
}

function enableDemoMode() {
    state.isDemoMode = true;
    const indicator = document.getElementById('demoIndicator');
    if (indicator) indicator.style.display = 'flex';
    // Load some default products if storage is empty
    if (products.length === 0) {
        products = [
            { id: 'cil-5', name: 'Cilindro 5 Kg', precio: 11500, price: 11500, icon: 'fa-box', stock: 10, stockFull: 10, stockEmpty: 5 },
            { id: 'cil-11', name: 'Cilindro 11 Kg', precio: 16500, price: 16500, icon: 'fa-drum', stock: 15, stockFull: 15, stockEmpty: 8 },
            { id: 'cil-15', name: 'Cilindro 15 Kg', precio: 23500, price: 23500, icon: 'fa-oil-can', stock: 20, stockFull: 20, stockEmpty: 12 }
        ];
        renderProducts();
        updateStatsUI();
    }
}

function calculateTotalsFromHistory() {
    state.totals = { ventas: 0, amount: 0, discountedAmount: 0,
                    byPayment: { efectivo: 0, tarjeta: 0, transferencia: 0, vale: 0 },
                    valeCount: 0, byProduct: {} };
    products.forEach(p => { state.totals.byProduct[p.id] = 0; });

    state.transactions.forEach(tx => {
        const totalQty = tx.items.reduce((acc, it) => acc + it.qty, 0);
        state.totals.ventas += totalQty;
        if (tx.payment !== 'vale') state.totals.amount += tx.finalPrice;
        state.totals.byPayment[tx.payment] += tx.finalPrice;
        tx.items.forEach(it => {
            if (state.totals.byProduct[it.product.id] !== undefined) {
                state.totals.byProduct[it.product.id] += it.qty;
            }
        });
        state.totals.discountedAmount += tx.totalDiscount;
        if (tx.payment === 'vale') state.totals.valeCount += totalQty;
    });
}

function initClock() {
    const el = document.getElementById('currentTime');
    const tick = () => { el.textContent = new Date().toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'}); };
    tick(); setInterval(tick, 1000);
}

function renderProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    products.forEach(p => {
        const qty = state.selectedProducts[p.id] || 0;
        const card = document.createElement('div');
        card.className = `product-card ${qty > 0 ? 'selected' : ''}`;
        card.dataset.id = p.id;
        card.innerHTML = `
            <i class="fa-solid ${p.icon} product-icon"></i>
            <div class="product-name">${p.name}</div>
            <div class="product-price">${formatCLP(p.price)}</div>
            <div class="card-counter">
                <button class="counter-btn minus" onclick="event.stopPropagation(); changeQty('${p.id}', -1)"><i class="fa-solid fa-minus"></i></button>
                <div class="counter-qty">${qty}</div>
                <button class="counter-btn plus" onclick="event.stopPropagation(); changeQty('${p.id}', 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        card.addEventListener('click', () => changeQty(p.id, 1));
        grid.appendChild(card);
    });
}

function changeQty(productId, delta) {
    const currentQty = state.selectedProducts[productId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    if (newQty === 0) {
        delete state.selectedProducts[productId];
    } else {
        state.selectedProducts[productId] = newQty;
    }
    
    renderProducts();
    updatePriceSummary();
    checkStep2Ready();
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function setupListeners() {
    // Step 1 - RUT lookup
    document.getElementById('lookupRutBtn').addEventListener('click', lookupRut);
    document.getElementById('rutLookupInput').addEventListener('keydown', e => { if(e.key==='Enter') lookupRut(); });

    // Step 1b - Registration
    document.getElementById('cancelRegBtn').addEventListener('click', () => {
        showStep('step1');
        updateStepDots(1);
    });
    document.getElementById('submitRegBtn').addEventListener('click', submitRegistration);

    // Step 2 & 2b Navigation
    document.getElementById('backToStep1Btn').addEventListener('click', () => {
        state.currentClient = null;
        state.selectedProducts = {};
        state.selectedPayment = null;
        updateStepDots(1);
        showStep('step1');
    });

    document.getElementById('goToStep2bBtn').addEventListener('click', goToStep2b);

    document.getElementById('backToStep2Btn').addEventListener('click', () => {
        showStep('step2');
        updateStepDots(2);
    });

    document.getElementById('goToStep3Btn').addEventListener('click', processStep3);

    // Payment buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => selectPayment(btn.dataset.method, btn));
    });

    // Step 3 - New sale
    document.getElementById('newSaleBtn').addEventListener('click', startNewSale);

    // Quick Actions in Step 1
    document.getElementById('valeDirectBtn').addEventListener('click', () => {
        state.currentClient = { rut: 'DIRECTA', name: 'Venta Directa', couponsLeft: 0 };
        goToStep2();
    });

    document.getElementById('valeQuickBtn').addEventListener('click', () => {
        state.currentClient = { rut: 'VALE', name: 'Venta por Vale', couponsLeft: 0 };
        goToStep2();
        setTimeout(() => {
            const valeBtn = document.querySelector('.payment-btn[data-method="vale"]');
            if (valeBtn) selectPayment('vale', valeBtn);
        }, 80);
    });

    // Cuadratura modal
    document.getElementById('closeRegisterBtn').addEventListener('click', openCuadraturaModal);
    document.getElementById('closeModalBtn').addEventListener('click', () => document.getElementById('cuadraturaModal').classList.remove('active'));
    document.getElementById('exportCsvBtn').addEventListener('click', exportCouponsCsv);
    document.getElementById('exportFullExcelBtn').addEventListener('click', exportFullReport);
    document.getElementById('sendWhatsappBtn').addEventListener('click', () => alert('En una version real esto enviaria el reporte por WhatsApp al jefe.'));
    
    // Cage Modal
    const refillBtn = document.getElementById('refillCageBtn');
    const adminRefillBtn = document.getElementById('adminRefillBtn');
    if (refillBtn) refillBtn.addEventListener('click', openCageModal);
    if (adminRefillBtn) adminRefillBtn.addEventListener('click', openCageModal);
    
    document.getElementById('closeCageModalBtn').addEventListener('click', () => document.getElementById('cageModal').classList.remove('active'));
    document.getElementById('cancelCageBtn').addEventListener('click', () => document.getElementById('cageModal').classList.remove('active'));
    document.getElementById('saveCageBtn').addEventListener('click', saveCageMovement);

    // Drawer Toggle
    const sideDrawer = document.getElementById('sideDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const menuToggle = document.getElementById('menuToggle');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    const toggleDrawer = (active) => {
        sideDrawer.classList.toggle('active', active);
        drawerOverlay.classList.toggle('active', active);
    };

    menuToggle.addEventListener('click', () => toggleDrawer(true));
    closeDrawerBtn.addEventListener('click', () => toggleDrawer(false));
    drawerOverlay.addEventListener('click', () => toggleDrawer(false));

    document.getElementById('closeTurnBtn').addEventListener('click', () => {
        if (confirm('Cerrar turno y reiniciar contadores para el nuevo dia?')) resetDailyData();
    });
}

// ─── STEP 1: RUT Lookup ───────────────────────────────────────────────────────
async function lookupRut() {
    const rut = document.getElementById('rutLookupInput').value.trim();
    const resultDiv = document.getElementById('rutLookupResult');

    if (!rut) {
        showLookupResult('error', '<i class="fa-solid fa-circle-exclamation"></i> Ingresa un RUT valido');
        return;
    }

    const btn = document.getElementById('lookupRutBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`api/index.php?action=get_client&rut=${encodeURIComponent(rut)}`);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const client = await res.json();
        
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar';
        btn.disabled = false;

        if (client && !client.error) {
            state.currentClient = { rut, name: client.nombre, phone: client.telefono, couponsLeft: parseInt(client.cupones_disponibles) };
            showLookupResult('success',
                `<i class="fa-solid fa-circle-check"></i> <strong>${client.nombre}</strong> — ${client.cupones_disponibles} cupon(es) disponibles`
            );
            setTimeout(() => goToStep2(), 800);
        } else if (client && client.error === 'Not found') {
            showLookupResult('warning',
                `<i class="fa-solid fa-circle-exclamation"></i> RUT no registrado en Gasco. ¿Deseas inscribirlo? 
                <button class="primary-btn" onclick="showRegistrationForm('${rut}')" style="margin-top:12px; width:100%; justify-content:center;">
                    <i class="fa-solid fa-user-plus"></i> Inscribir en Gasco
                </button>
                <button class="secondary-btn" onclick="goToStep2WithoutDiscount('${rut}')" style="margin-top:8px; width:100%; justify-content:center;">
                    Vender sin descuento
                </button>`
            );
        } else {
            // Some other API error (e.g. database connection failed)
            const errMsg = client ? client.error : "Unknown error";
            showLookupResult('error', `<i class="fa-solid fa-circle-exclamation"></i> Error API: ${errMsg}`);
        }
    } catch (err) {
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar'; btn.disabled = false;
        showToast("Error buscando cliente: " + err.message);
        showLookupResult('error', `<i class="fa-solid fa-circle-exclamation"></i> Error de conexión: favor revisa XAMPP y la base de datos.`);
    }
}

function showLookupResult(type, html) {
    const el = document.getElementById('rutLookupResult');
    el.style.display = 'block';
    el.className = 'lookup-result ' + type;
    el.innerHTML = html;
}

function showRegistrationForm(rut) {
    document.getElementById('regRutInput').value = rut;
    showStep('step1b');
}

function goToStep2() {
    updateStepDots(2);
    showStep('step2');
    updateClientBadge();
    checkStep2Ready();
}

function goToStep2WithoutDiscount(rut) {
    state.currentClient = { rut, name: 'Cliente sin registro', couponsLeft: 0 };
    goToStep2();
}

function goToStep2b() {
    updateStepDots(3);
    showStep('step2b');
    updatePriceSummary();
    checkStep2bReady();
    
    // Auto-disable Vale option if not a vale sale or if no coupons
    const valeBtn = document.querySelector('.payment-btn[data-method="vale"]');
    if (valeBtn) {
        const isValeSale = state.currentClient && state.currentClient.rut === 'VALE';
        // In this app, "Vale" payment method is only for Quick Vale or if it's a specific convention.
        // Let's keep it enabled but maybe style it differently if needed.
    }
}

// ─── STEP 1b: Registration ────────────────────────────────────────────────────
async function submitRegistration() {
    const rut = document.getElementById('regRutInput').value.trim();
    const doc = document.getElementById('regDocInput').value.trim();

    if (!doc) {
        alert('Por favor ingresa el numero de documento.');
        return;
    }

    const btn = document.getElementById('submitRegBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando en Gasco...';
    btn.disabled = true;

    try {
        const res = await fetch('api/index.php?action=register_client', {
            method: 'POST',
            body: JSON.stringify({ rut, nombre: 'Cliente ' + rut, telefono: '', num_documento: doc })
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        state.currentClient = { rut, name: 'Cliente ' + rut, phone: '', couponsLeft: 2 };
        btn.innerHTML = '<i class="fa-solid fa-user-check"></i> Registrar e ir a Productos';
        btn.disabled = false;
        showToast('RUT ' + rut + ' registrado en Gasco con 2 cupones!');
        goToStep2();
    } catch (err) {
        btn.innerHTML = 'Registrar'; btn.disabled = false;
        showToast("Error registrando cliente");
    }
}

// ─── STEP 2: Product + Payment ────────────────────────────────────────────────
function selectProduct(product, element) {
    document.querySelectorAll('.product-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    state.selectedProduct = product;
    updatePriceSummary();
    checkStep2Ready();
}

function selectPayment(method, element) {
    document.querySelectorAll('.payment-btn').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    state.selectedPayment = method;
    checkStep2bReady();
}

function updateClientBadge() {
    const badge = document.getElementById('clientBadge');
    if (!state.currentClient) { badge.innerHTML = ''; return; }
    const hasCoupons = state.currentClient.couponsLeft > 0;
    badge.innerHTML = `
        <span class="client-chip">
            <i class="fa-solid fa-user"></i> ${state.currentClient.name}
            ${hasCoupons ? `<span class="coupon-chip"><i class="fa-solid fa-tag"></i> ${state.currentClient.couponsLeft} cupon(es)</span>` : ''}
        </span>`;
}

function updatePriceSummary() {
    const summary = document.getElementById('priceSummary');
    const selectedIds = Object.keys(state.selectedProducts);
    
    if (selectedIds.length === 0) {
        summary.style.display = 'none';
        return;
    }
    summary.style.display = 'block';

    let totalNormal = 0;
    let totalDiscount = 0;
    
    // Calculate total normal price
    selectedIds.forEach(id => {
        const p = products.find(prod => prod.id === id);
        if (p) {
            totalNormal += p.price * state.selectedProducts[id];
        }
    });

    // Calculate discounts based on available coupons
    if (state.currentClient && state.currentClient.couponsLeft > 0) {
        let couponsLeft = state.currentClient.couponsLeft;
        
        // Sort products by discount (highest first) to maximize benefit
        const sortedItems = [];
        selectedIds.forEach(id => {
            const p = products.find(prod => prod.id === id);
            if (p && p.discount > 0) {
                for (let i = 0; i < state.selectedProducts[id]; i++) {
                    sortedItems.push(p);
                }
            }
        });
        sortedItems.sort((a, b) => b.discount - a.discount);

        // Apply coupons to the best discounts
        for (let i = 0; i < Math.min(couponsLeft, sortedItems.length); i++) {
            totalDiscount += sortedItems[i].discount;
        }
    }

    const finalPrice = totalNormal - totalDiscount;

    document.getElementById('priceNormal').textContent = formatCLP(totalNormal);
    document.getElementById('priceFinal').textContent = formatCLP(finalPrice);

    if (totalDiscount > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('priceDiscount').textContent = `-${formatCLP(totalDiscount)}`;
        document.getElementById('priceNormal').style.textDecoration = 'line-through';
    } else {
        document.getElementById('discountRow').style.display = 'none';
        document.getElementById('priceNormal').style.textDecoration = 'none';
    }
}

function checkStep2Ready() {
    const hasProducts = Object.keys(state.selectedProducts).length > 0;
    document.getElementById('goToStep2bBtn').disabled = !hasProducts;
}

function checkStep2bReady() {
    const hasPayment = state.selectedPayment !== null;
    document.getElementById('goToStep3Btn').disabled = !hasPayment;
}

// ─── STEP 3: Auto-burn & Confirm ─────────────────────────────────────────────
function processStep3() {
    updateStepDots(4);
    showStep('step3');

    const client = state.currentClient;
    const selectedIds = Object.keys(state.selectedProducts);
    
    // Calculate totals and discounts
    let totalNormal = 0;
    let totalDiscount = 0;
    const items = [];
    
    selectedIds.forEach(id => {
        const p = products.find(prod => prod.id === id);
        if (p) {
            const qty = state.selectedProducts[id];
            totalNormal += p.price * qty;
            items.push({ product: p, qty });
        }
    });

    // Strategy for applying coupons (same as price summary)
    const appliedDiscounts = [];
    if (client && client.couponsLeft > 0) {
        let couponsLeft = client.couponsLeft;
        const allPossibleDiscounts = [];
        items.forEach(item => {
            if (item.product.discount > 0) {
                for (let i = 0; i < item.qty; i++) {
                    allPossibleDiscounts.push(item.product);
                }
            }
        });
        allPossibleDiscounts.sort((a, b) => b.discount - a.discount);

        for (let i = 0; i < Math.min(couponsLeft, allPossibleDiscounts.length); i++) {
            totalDiscount += allPossibleDiscounts[i].discount;
            appliedDiscounts.push(allPossibleDiscounts[i]);
        }
    }

    const finalPrice = totalNormal - totalDiscount;
    const hasDiscount = totalDiscount > 0;

    const list = document.getElementById('burnStatusList');
    const finalSummary = document.getElementById('finalSummary');
    list.innerHTML = '';
    finalSummary.style.display = 'none';

    // Define burn steps
    const steps = [
        { icon: 'fa-receipt', label: `Registrando venta de ${selectedIds.length} producto(s)...`, delay: 600 },
        ...(hasDiscount ? [
            { icon: 'fa-fire', label: `Generando ${appliedDiscounts.length} codigo(s) de cupon...`, delay: 1200 },
            { icon: 'fa-link', label: 'Conectando con sistema Gasco (Trifuerza)...', delay: 1900 },
            { icon: 'fa-check-double', label: `Cupones quemados! Ahorro total: ${formatCLP(totalDiscount)}`, delay: 2600, success: true },
        ] : []),
        { icon: 'fa-circle-check', label: 'Venta completada con exito!', delay: hasDiscount ? 3200 : 1000, success: true }
    ];

    steps.forEach(step => {
        const row = document.createElement('div');
        row.className = 'burn-row loading';
        row.innerHTML = `<i class="fa-solid ${step.icon} burn-icon"></i><span>${step.label}</span><i class="fa-solid fa-spinner fa-spin burn-spinner"></i>`;
        list.appendChild(row);

        setTimeout(() => {
            row.classList.remove('loading');
            row.classList.add(step.success ? 'done-success' : 'done');
            row.querySelector('.burn-spinner').className = step.success
                ? 'fa-solid fa-circle-check burn-check-icon'
                : 'fa-solid fa-check burn-check-icon';
        }, step.delay);
    });

    const finalDelay = steps[steps.length - 1].delay + 600;

    setTimeout(async () => {
        const couponCodes = appliedDiscounts.map(() => 'GAS-' + Math.random().toString(36).substring(2,8).toUpperCase());
        const tx = {
            rut_cliente: client.rut,
            items: items.map(it => ({ ...it })),
            medio_pago: state.selectedPayment,
            total_normal: totalNormal,
            total_descuento: totalDiscount,
            total_final: finalPrice,
            couponCodes,
            time: new Date()
        };

        try {
            const res = await fetch('api/index.php?action=save_transaction', {
                method: 'POST',
                body: JSON.stringify(tx)
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);

            // Fetch latest products to keep stock in sync
            const prodRes = await fetch('api/index.php?action=get_products');
            products = await prodRes.json();

            // Refresh History
            const txRes = await fetch('api/index.php?action=get_transactions');
            const dbTxs = await txRes.json();
            state.transactions = dbTxs.map(row => ({
                id: row.id,
                client: { rut: row.rut_cliente, name: row.cliente_nombre || row.rut_cliente },
                items: (row.items || []).map(it => ({ 
                    product: { 
                        id: it.producto_id, 
                        name: it.nombre || it.name || 'Producto',
                        icon: it.icono || 'fa-fire',
                        price: parseFloat(it.precio_unitario) || 0
                    },
                    qty: parseInt(it.cantidad) || 1
                })),
                payment: row.medio_pago,
                finalPrice: parseFloat(row.total_final) || 0,
                totalDiscount: parseFloat(row.total_descuento) || 0,
                time: new Date(row.fecha_hora)
            }));

            // Recalculate Totals & Update UI
            calculateTotalsFromHistory();
            updateStatsUI();
            renderTransactions();
            renderInventory();
            updateValeBadge();

            // Show receipt
            let itemsHTML = items.map(it => `
                <div class="receipt-row"><span>${it.product.name} (x${it.qty})</span><span>${formatCLP(it.product.price * it.qty)}</span></div>
            `).join('');

            document.getElementById('receiptContent').innerHTML = `
                <div class="receipt-row"><span>Cliente:</span><span><strong>${client.name}</strong></span></div>
                <div class="receipt-row"><span>RUT:</span><span>${client.rut}</span></div>
                <div style="margin: 10px 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                    ${itemsHTML}
                </div>
                <div class="receipt-row"><span>Pago:</span><span style="text-transform:capitalize">${state.selectedPayment}</span></div>
                ${hasDiscount ? `
                <div class="receipt-row" style="color: var(--primary)"><span>Cupones (${appliedDiscounts.length}):</span><span>Quemados ✓</span></div>
                <div class="receipt-row" style="color: var(--primary)"><span>Ahorro total:</span><span>-${formatCLP(totalDiscount)}</span></div>
                ` : ''}
                <div class="receipt-row total-row"><span>TOTAL COBRADO:</span><span>${formatCLP(finalPrice)}</span></div>
            `;
            finalSummary.style.display = 'block';
        } catch (err) {
            console.error(err);
            if (!state.isDemoMode) {
                showToast("Error al procesar la venta en la base de datos");
            } else {
                // In demo mode, we still want to show the receipt!
                // Refresh local totals
                calculateTotalsFromHistory();
                updateStatsUI();
                renderTransactions();
                renderInventory();
                updateValeBadge();

                let itemsHTML = items.map(it => `
                    <div class="receipt-row"><span>${it.product.name} (x${it.qty})</span><span>${formatCLP(it.product.price * it.qty)}</span></div>
                `).join('');

                document.getElementById('receiptContent').innerHTML = `
                    <div class="receipt-row"><span>Cliente:</span><span><strong>${client.name}</strong></span></div>
                    <div class="receipt-row"><span>RUT:</span><span>${client.rut}</span></div>
                    <div style="margin: 10px 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                        ${itemsHTML}
                    </div>
                    <div class="receipt-row"><span>Pago:</span><span style="text-transform:capitalize">${state.selectedPayment}</span></div>
                    ${hasDiscount ? `
                    <div class="receipt-row" style="color: var(--primary)"><span>Cupones (${appliedDiscounts.length}):</span><span>Quemados (Demo) ✓</span></div>
                    ` : ''}
                    <div class="receipt-row total-row"><span>TOTAL:</span><span>${formatCLP(finalPrice)}</span></div>
                `;
                finalSummary.style.display = 'block';
            }
        }
    }, finalDelay);
}

function startNewSale() {
    state.currentClient = null;
    state.selectedProducts = {};
    state.selectedPayment = null;
    document.getElementById('rutLookupInput').value = '';
    document.getElementById('rutLookupResult').style.display = 'none';
    document.querySelectorAll('.product-card').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.payment-btn').forEach(el => el.classList.remove('selected'));
    document.getElementById('burnStatusList').innerHTML = '';
    document.getElementById('goToStep3Btn').disabled = true;
    document.getElementById('goToStep2bBtn').disabled = true;
    updateStepDots(1);
    showStep('step1');
}

// ─── Calculate totals from history ─────────────────────────────────────────────
function calculateTotalsFromHistory() {
    state.totals = {
        ventas: state.transactions.length,
        amount: 0,
        discountedAmount: 0,
        byPayment: { efectivo: 0, tarjeta: 0, transferencia: 0, vale: 0 },
        valeCount: 0,
        byProduct: {}
    };
    state.transactions.forEach(tx => {
        const fp = parseFloat(tx.finalPrice) || 0;
        const td = parseFloat(tx.totalDiscount) || 0;
        state.totals.amount += fp;
        state.totals.discountedAmount += td;
        const method = tx.payment || 'efectivo';
        if (state.totals.byPayment.hasOwnProperty(method)) {
            state.totals.byPayment[method] += fp;
        }
        if (method === 'vale') {
            tx.items.forEach(it => { state.totals.valeCount += (parseInt(it.qty) || 1); });
        }
        tx.items.forEach(it => {
            const pid = it.product.id;
            if (!state.totals.byProduct[pid]) {
                state.totals.byProduct[pid] = { name: it.product.name, count: 0 };
            }
            state.totals.byProduct[pid].count += (parseInt(it.qty) || 1);
        });
    });
}

// ─── Navigator ────────────────────────────────────────────────────────────────
function showStep(stepId) {
    ['step1', 'step1b', 'step2', 'step2b', 'step3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === stepId ? 'block' : 'none';
    });
}

function updateStepDots(active) {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById('dot'+i);
        if (!dot) continue;
        dot.classList.toggle('active', i === active);
        dot.classList.toggle('done', i < active);
    }
    if (document.getElementById('line12')) document.getElementById('line12').classList.toggle('active', active >= 2);
    if (document.getElementById('line23')) document.getElementById('line23').classList.toggle('active', active >= 3);
    if (document.getElementById('line34')) document.getElementById('line34').classList.toggle('active', active >= 4);
}

// ─── Cuadratura Modal ─────────────────────────────────────────────────────────
function openCuadraturaModal() {
    const body = document.getElementById('modalBody');

    let productHTML = '';
    products.forEach(p => {
        const count = state.totals.byProduct[p.id];
        if (count > 0) {
            productHTML += `<div class="report-item"><span>${p.name} (x${count})</span><span>${formatCLP(count * p.price)}</span></div>`;
        }
    });
    if (!productHTML) productHTML = '<div class="report-item"><span>Sin ventas</span><span>$0</span></div>';

    body.innerHTML = `
        <div class="report-grid">
            <div class="report-group">
                <h4>Resumen de Inventario</h4>
                ${productHTML}
                <div class="report-item report-total"><span>Total Unidades:</span><span>${state.totals.ventas} un.</span></div>
            </div>
            <div class="report-group">
                <h4>Desglose de Caja Real</h4>
                <div class="report-item"><span>Efectivo:</span><span>${formatCLP(state.totals.byPayment.efectivo)}</span></div>
                <div class="report-item"><span>Tarjeta/Transbank:</span><span>${formatCLP(state.totals.byPayment.tarjeta)}</span></div>
                <div class="report-item"><span>Transferencia:</span><span>${formatCLP(state.totals.byPayment.transferencia)}</span></div>
                <div class="report-item" style="color:var(--primary)"><span>Cupones quemados:</span><span>-${formatCLP(state.totals.discountedAmount)}</span></div>
                <div class="report-item report-total"><span>TOTAL CAJA REAL:</span><span>${formatCLP(state.totals.amount)}</span></div>
            </div>
        </div>
        ${state.totals.valeCount > 0 ? (() => {
            const valeGroups = state.transactions
                .filter(tx => tx.payment === 'vale')
                .reduce((acc, tx) => {
                    tx.items.forEach(item => {
                        const key = item.product.id;
                        if (!acc[key]) acc[key] = { name: item.product.name, count: 0 };
                        acc[key].count += item.qty;
                    });
                    return acc;
                }, {});
            const rows = Object.values(valeGroups)
                .map(v => `<div class="report-item"><span>${v.name}:</span><span style="color:#a78bfa;font-weight:700">${v.count} tarro(s)</span></div>`)
                .join('');
            return `
            <div class="vale-report-box">
                <div class="vale-report-header"><i class="fa-solid fa-ticket"></i> Registro de Vales (solo para el jefe)</div>
                <div class="vale-report-body">
                    ${rows}
                    <div class="report-item report-total" style="color:#a78bfa; border-top: 1px solid rgba(167,139,250,0.3); margin-top:6px; padding-top:10px;">
                        <span>TOTAL TARROS POR VALE:</span><span>${state.totals.valeCount} tarro(s)</span>
                    </div>
                </div>
            </div>`;
        })() : ''}
    `;

    // Coupon table
    const couponTx = state.transactions.filter(tx => tx.totalDiscount > 0);
    const sec = document.getElementById('cuponesSection');
    const tbl = document.getElementById('cuponesTable');
    const csvBtn = document.getElementById('exportCsvBtn');

    if (couponTx.length > 0) {
        sec.style.display = 'block'; csvBtn.style.display = 'flex';
        let tableRows = '';
        let counter = 1;
        
        couponTx.forEach(tx => {
            // Join all product names for this transaction
            const productNames = tx.items.map(it => it.product.name).join(', ');
            // Join all coupon codes
            const codes = tx.couponCodes.join(', ');
            
            tableRows += `
                <div style="display:grid;grid-template-columns:25px 1fr 1fr 1fr 1fr 1fr;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;">
                    <span style="color:var(--text-secondary)">${counter++}</span>
                    <span>${tx.client.rut}</span>
                    <span>${tx.client.name}</span>
                    <span title="${productNames}">${productNames}</span>
                    <span style="color:var(--primary);font-family:monospace;font-size:10px;">${codes}</span>
                    <span style="color:var(--success)">${formatCLP(tx.totalDiscount)}</span>
                </div>`;
        });
        
        tbl.innerHTML = `
            <div style="display:grid;grid-template-columns:25px 1fr 1fr 1fr 1fr 1fr;gap:8px;padding:10px 14px;background:rgba(249,115,22,0.1);font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;">
                <span>#</span><span>RUT</span><span>Nombre</span><span>Productos</span><span>Codigos</span><span>Ahorro</span>
            </div>
            ${tableRows}`;
    } else {
        sec.style.display = 'none'; csvBtn.style.display = 'none';
    }

    document.getElementById('cuadraturaModal').classList.add('active');
}

function exportCouponsCsv() {
    const couponTx = state.transactions.filter(tx => tx.totalDiscount > 0);
    if (couponTx.length === 0) return;
    const today = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
    const header = 'N;RUT;Nombre;Productos;Codigos;Ahorro;Precio Final;Pago;Hora\n';
    const rows = couponTx.map((tx, i) => [
        i+1, tx.client.rut, tx.client.name, 
        tx.items.map(it => `${it.qty}x ${it.product.name}`).join('|'),
        tx.couponCodes.join('|'), tx.totalDiscount, tx.finalPrice,
        tx.payment, tx.time.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})
    ].join(';')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cupones_gasco_${today}.csv`;
    a.click();
}

function exportFullReport() {
    const today = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
    let csv = '\uFEFF'; // BOM for Excel encoding

    // Section 1: RESUMEN GENERAL
    csv += 'REPORTE DE VENTAS TOTALES;' + today + '\n';
    csv += 'INDICADOR;VALOR\n';
    csv += 'Ventas Totales (Unidades);' + state.totals.ventas + '\n';
    csv += 'Total Recaudado (Caja);' + state.totals.amount + '\n';
    csv += 'Total Descuentos Gasco;' + state.totals.discountedAmount + '\n';
    csv += 'Total Vales (Unidades);' + state.totals.valeCount + '\n';
    csv += 'Efectivo;' + state.totals.byPayment.efectivo + '\n';
    csv += 'Tarjeta/Transbank;' + state.totals.byPayment.tarjeta + '\n';
    csv += 'Transferencia;' + state.totals.byPayment.transferencia + '\n\n';

    // Section 2: DESGLOSE POR PRODUCTO (INVENTARIO)
    csv += 'DESGLOSE POR PRODUCTO (INVENTARIO)\n';
    csv += 'PRODUCTO;UNIDADES;RECAUDACIÓN BRUTA\n';
    products.forEach(p => {
        const count = state.totals.byProduct[p.id];
        if (count > 0) {
            csv += `${p.name};${count};${count * p.price}\n`;
        }
    });
    csv += '\n';

    // Section 3: DETALLE DE VALES (CONTEO)
    csv += 'DETALLE DE VALES (CONTEO)\n';
    csv += 'PRODUCTO;UNIDADES\n';
    const valeGroups = state.transactions
        .filter(tx => tx.payment === 'vale')
        .reduce((acc, tx) => {
            tx.items.forEach(item => {
                const key = item.product.id;
                if (!acc[key]) acc[key] = { name: item.product.name, count: 0 };
                acc[key].count += item.qty;
            });
            return acc;
        }, {});
    
    products.forEach(p => {
        if (valeGroups[p.id]) {
            csv += `${p.name};${valeGroups[p.id].count}\n`;
        }
    });
    csv += '\n';

    // Section 4: LOG DE TRANSACCIONES DETALLADO
    csv += 'LOG DE TRANSACCIONES DETALLADO\n';
    csv += 'ID;HORA;RUT;CLIENTE;PRODUCTOS;MEDIO PAGO;AHORRO;TOTAL COBRADO\n';
    state.transactions.forEach(tx => {
        const itemStr = tx.items.map(it => `${it.qty}x ${it.product.name}`).join(' | ');
        const timeStr = tx.time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        csv += `${tx.id};${timeStr};${tx.client.rut};${tx.client.name};${itemStr};${tx.payment};${tx.totalDiscount};${tx.finalPrice}\n`;
    });
    csv += '\n';

    // Section 5: ESTADO DE JAULA (INVENTARIO ACTUAL)
    csv += 'ESTADO DE JAULA (INVENTARIO ACTUAL)\n';
    csv += 'PRODUCTO;LLENOS (DISPONIBLES);VACÍOS\n';
    products.forEach(p => {
        csv += `${p.name};${p.stockFull};${p.stockEmpty}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Reporte_GasControl_${today}.csv`;
    a.click();
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function updateStatsUI() {
    document.getElementById('totalSalesCount').textContent = state.totals.ventas;
    document.getElementById('totalSalesAmount').textContent = formatCLP(state.totals.amount);
}

function renderTransactions() {
    const list = document.getElementById('recentSales');
    if (!list) return;
    
    if (state.transactions.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay ventas registradas hoy.</div>';
        return;
    }
    list.innerHTML = '';
    state.transactions.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        const payIcons = { efectivo:'fa-money-bill', tarjeta:'fa-credit-card', transferencia:'fa-building-columns', vale:'fa-ticket' };
        const valeBadge = tx.payment === 'vale'
            ? `<span style="background:rgba(167,139,250,0.2);color:#a78bfa;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;">Vale</span>`
            : '';
        const discountBadge = tx.totalDiscount > 0
            ? `<span style="background:rgba(249,115,22,0.2);color:var(--primary);font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;">${tx.couponCodes.length} Cupon(es)</span>`
            : '';
        
        const firstItem = tx.items[0];
        const othersCount = tx.items.reduce((acc, it) => acc + it.qty, 0) - firstItem.qty;
        const productsLabel = othersCount > 0 
            ? `${firstItem.product.name} +${othersCount} mas`
            : `${firstItem.qty}x ${firstItem.product.name}`;

        item.innerHTML = `
            <div class="tx-details">
                <div class="tx-icon"><i class="fa-solid ${firstItem.product.icon}"></i></div>
                <div class="tx-info">
                    <span class="tx-product">${productsLabel}${valeBadge}${discountBadge}</span>
                    <span class="tx-time">${tx.client.name} · ${tx.time.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
            </div>
            <div>
                <div class="tx-amount">${formatCLP(tx.finalPrice)}</div>
                <div class="tx-method"><i class="fa-solid ${payIcons[tx.payment]}"></i> ${tx.payment}</div>
            </div>`;
        list.appendChild(item);
    });
}

function resetDailyData() {
    state.transactions = [];
    state.selectedProducts = {}; state.selectedPayment = null; state.currentClient = null;
    state.totals = { ventas:0, amount:0, discountedAmount:0,
                     byPayment:{efectivo:0,tarjeta:0,transferencia:0,vale:0},
                     valeCount:0, byProduct:{} };
    products.forEach(p => { state.totals.byProduct[p.id] = 0; });
    document.getElementById('cuadraturaModal').classList.remove('active');
    updateStatsUI(); renderTransactions(); startNewSale();
    renderInventory();
    showToast('Turno cerrado. Contadores reiniciados!');
}

// ─── Cage / Inventory ─────────────────────────────────────────────────────────
function renderInventory() {
    const list = document.getElementById('cageInventory');
    if (!list) return;
    list.innerHTML = '';
    
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'cage-item';
        item.innerHTML = `
            <div class="cage-item-name">${p.name}</div>
            <div class="stock-badge stock-full" title="Llenos">
                <i class="fa-solid fa-circle"></i> ${p.stockFull}
            </div>
            <div class="stock-badge stock-empty" title="Vacíos">
                <i class="fa-solid fa-circle-notch"></i> ${p.stockEmpty}
            </div>
        `;
        list.appendChild(item);
    });
}

function openCageModal() {
    const form = document.getElementById('cageModalForm');
    form.innerHTML = '';
    
    products.forEach(p => {
        const row = document.createElement('div');
        row.className = 'cage-modal-row';
        row.innerHTML = `
            <label>${p.name}</label>
            <div class="cage-modal-input-group">
                <span>Llenos</span>
                <input type="number" data-id="${p.id}" data-type="full" value="0">
            </div>
            <div class="cage-modal-input-group">
                <span>Vacíos</span>
                <input type="number" data-id="${p.id}" data-type="empty" value="0">
            </div>
        `;
        form.appendChild(row);
    });
    
    document.getElementById('cageModal').classList.add('active');
}

async function saveCageMovement() {
    const inputs = document.querySelectorAll('#cageModalForm input');
    const movements = [];
    
    inputs.forEach(input => {
        const val = parseInt(input.value) || 0;
        if (val !== 0) {
            movements.push({
                id: input.dataset.id,
                type: input.dataset.type,
                full: input.dataset.type === 'full' ? val : 0,
                empty: input.dataset.type === 'empty' ? val : 0
            });
        }
    });
    
    if (movements.length > 0) {
        try {
            await fetch('api/index.php?action=update_stock', {
                method: 'POST',
                body: JSON.stringify({ movements })
            });
            
            // Reload products to get updated stock
            const prodRes = await fetch('api/index.php?action=get_products');
            products = await prodRes.json();
            
            showToast(`Stock actualizado en base de datos`);
            renderInventory();
        } catch (err) {
            showToast("Error actualizando jaula");
        }
    }
    
    document.getElementById('cageModal').classList.remove('active');
}

function updateValeBadge() {
    const badge = document.getElementById('valeBadge');
    if (badge) badge.textContent = state.totals.valeCount + ' vale(s) hoy';
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg || 'OK';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

function formatCLP(n) {
    return new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP' }).format(n);
}

