let sessionsData = [];

function parseLogFile(fileName, content) {
    const lines = content.split('\n');
    const session = {
        fileName: fileName,
        length: '00:00h',
        xpGain: '0',
        xpH: '0',
        loot: 0,
        supplies: 0,
        balance: 0,
        damageH: '0',
        healingH: '0',
        monsters: {},
        items: {}
    };

    let currentSection = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('Session length:')) {
            session.length = trimmed.replace('Session length:', '').trim();
        } else if (trimmed.startsWith('XP Gain:')) {
            session.xpGain = trimmed.replace('XP Gain:', '').trim();
        } else if (trimmed.startsWith('XP/h:')) {
            session.xpH = trimmed.replace('XP/h:', '').trim();
        } else if (trimmed.startsWith('Loot:')) {
            session.loot = parseNumber(trimmed.replace('Loot:', ''));
        } else if (trimmed.startsWith('Supplies:')) {
            session.supplies = parseNumber(trimmed.replace('Supplies:', ''));
        } else if (trimmed.startsWith('Balance:')) {
            session.balance = parseNumber(trimmed.replace('Balance:', ''));
        } else if (trimmed.startsWith('Damage/h:')) {
            session.damageH = trimmed.replace('Damage/h:', '').trim();
        } else if (trimmed.startsWith('Healing/h:')) {
            session.healingH = trimmed.replace('Healing/h:', '').trim();
        } else if (trimmed.startsWith('Killed Monsters:')) {
            currentSection = 'monsters';
        } else if (trimmed.startsWith('Looted Items:')) {
            currentSection = 'items';
        } else if (currentSection === 'monsters') {
            const match = trimmed.match(/^(\d+)x\s+(.+)$/);
            if (match) {
                session.monsters[match[2].trim()] = parseInt(match[1], 10);
            }
        } else if (currentSection === 'items') {
            const match = trimmed.match(/^(\d+)x\s+(.+)$/);
            if (match) {
                session.items[match[2].trim()] = parseInt(match[1], 10);
            }
        }
    });

    return session;
}

function parseNumber(str) {
    const cleaned = str.replace(/[^\d-]/g, '');
    return parseInt(cleaned, 10) || 0;
}

function formatGP(val) {
    return val.toLocaleString('pt-BR') + ' GP';
}

function parseDurationMinutes(durationStr) {
    const parts = durationStr.replace('h', '').split(':');
    if (parts.length === 2) {
        return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
    }
    return 0;
}

function updateOverview() {
    document.getElementById('total-sessions').innerText = sessionsData.length;

    let totalMinutes = 0;
    let totalLoot = 0;
    let totalSupplies = 0;
    let totalBalance = 0;
    let totalMonsters = 0;

    sessionsData.forEach(s => {
        totalMinutes += parseDurationMinutes(s.length);
        totalLoot += s.loot;
        totalSupplies += s.supplies;
        totalBalance += s.balance;
        Object.values(s.monsters).forEach(count => totalMonsters += count);
    });

    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const mins = (totalMinutes % 60).toString().padStart(2, '0');

    document.getElementById('total-time').innerText = `${hours}:${mins}h`;
    document.getElementById('total-loot').innerText = formatGP(totalLoot);
    document.getElementById('total-supplies').innerText = formatGP(totalSupplies);
    document.getElementById('total-balance').innerText = formatGP(totalBalance);
    document.getElementById('total-monsters').innerText = totalMonsters.toLocaleString('pt-BR');
}

function populateComparisonTable() {
    const tbody = document.querySelector('#comparison-table tbody');
    tbody.innerHTML = '';

    if (sessionsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-msg">Nenhum log importado. Inicie a caçada carregando um arquivo.</td></tr>';
        return;
    }

    sessionsData.forEach(session => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${session.fileName}</strong></td>
            <td>${session.length}</td>
            <td>${session.xpGain}</td>
            <td>${session.xpH}</td>
            <td class="highlight-blue">${formatGP(session.loot)}</td>
            <td class="highlight-orange">${formatGP(session.supplies)}</td>
            <td class="highlight-green">${formatGP(session.balance)}</td>
            <td>${session.damageH}</td>
            <td>${session.healingH}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateMonstersTable() {
    const tbody = document.querySelector('#monsters-table tbody');
    tbody.innerHTML = '';

    if (sessionsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">Nenhum monstro registrado.</td></tr>';
        return;
    }

    const monstersTotal = {};
    sessionsData.forEach(session => {
        for (const [monster, count] of Object.entries(session.monsters)) {
            monstersTotal[monster] = (monstersTotal[monster] || 0) + count;
        }
    });

    const sorted = Object.entries(monstersTotal).sort((a, b) => b[1] - a[1]);

    sorted.forEach(([monster, count]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${monster}</td><td><strong>${count}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function populateLootTable() {
    const tbody = document.querySelector('#loot-table tbody');
    tbody.innerHTML = '';

    if (sessionsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">Nenhum item coletado.</td></tr>';
        return;
    }

    const lootTotal = {};
    sessionsData.forEach(session => {
        for (const [item, count] of Object.entries(session.items)) {
            lootTotal[item] = (lootTotal[item] || 0) + count;
        }
    });

    const sorted = Object.entries(lootTotal).sort((a, b) => b[1] - a[1]);

    sorted.forEach(([item, count]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item}</td><td><strong>${count}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function setupTabs() {
    const tabsContainer = document.getElementById('session-tabs');
    const contentContainer = document.getElementById('session-detail-content');

    tabsContainer.innerHTML = '';

    if (sessionsData.length === 0) {
        contentContainer.innerHTML = '<p class="empty-msg">Carregue arquivos de log para visualizar os detalhes da sua hunt.</p>';
        return;
    }

    sessionsData.forEach((session, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        btn.innerText = session.fileName;
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSessionDetail(session);
        };
        tabsContainer.appendChild(btn);
    });

    renderSessionDetail(sessionsData[0]);
}

function renderSessionDetail(session) {
    const contentContainer = document.getElementById('session-detail-content');

    let monstersList = Object.entries(session.monsters)
        .map(([m, c]) => `<li>${c}x <span>${m}</span></li>`).join('') || '<li>Nenhum monstro registrado</li>';

    let itemsList = Object.entries(session.items)
        .map(([i, c]) => `<li>${c}x <span>${i}</span></li>`).join('') || '<li>Nenhum item registrado</li>';

    contentContainer.innerHTML = `
        <h3 style="font-family: 'Cinzel', serif; font-size: 1.1rem; color: var(--tibia-gold);">${session.fileName}</h3>
        
        <div class="detail-metrics-grid">
            <div class="detail-metric-item"><span>Duração</span><strong>${session.length}</strong></div>
            <div class="detail-metric-item"><span>XP Total</span><strong>${session.xpGain}</strong></div>
            <div class="detail-metric-item"><span>XP/h</span><strong>${session.xpH}</strong></div>
            <div class="detail-metric-item"><span>Loot</span><strong class="highlight-blue">${formatGP(session.loot)}</strong></div>
            <div class="detail-metric-item"><span>Supplies</span><strong class="highlight-orange">${formatGP(session.supplies)}</strong></div>
            <div class="detail-metric-item"><span>Balance</span><strong class="highlight-green">${formatGP(session.balance)}</strong></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-top: 16px;">
            <div>
                <h4 style="font-size: 0.875rem; color: var(--tibia-text-muted); margin-bottom: 12px; font-weight: 600;">Criaturas Mortas</h4>
                <ul style="list-style-type: none; display: flex; flex-direction: column; gap: 6px;">${monstersList}</ul>
            </div>
            <div>
                <h4 style="font-size: 0.875rem; color: var(--tibia-text-muted); margin-bottom: 12px; font-weight: 600;">Itens Obtidos</h4>
                <ul style="list-style-type: none; column-count: 2; column-gap: 20px;">${itemsList}</ul>
            </div>
        </div>
    `;
}

document.getElementById('file-input').addEventListener('change', (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    sessionsData = [];
    let filesRead = 0;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = parseLogFile(file.name, e.target.result);
            sessionsData.push(parsed);
            filesRead++;

            if (filesRead === files.length) {
                updateOverview();
                populateComparisonTable();
                populateMonstersTable();
                populateLootTable();
                setupTabs();
            }
        };
        reader.readAsText(file);
    });
});