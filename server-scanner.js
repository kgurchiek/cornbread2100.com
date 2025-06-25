const limit = 20;
let serverList = document.getElementById('serverlist');
serverList.addEventListener('wheel', async (e) => {
    if (e.deltaY > 0 && serverList.scrollHeight - (serverList.scrollTop + serverList.clientHeight) <= 50) {
        if (!loading) {
            args.set('skip', parseInt(args.get('skip')) + parseInt(args.get('limit')));
            updateServers(true);
        }
        serverList.scrollTo(0, serverList.scrollTop + serverList.clientHeight);
        e.preventDefault();
    }
    if (e.deltaY < 0 && serverList.scrollTop == 0) e.preventDefault();
});

let dropdown = document.getElementById('filter-dropdown');
function toggleDropdown() {
    dropdown.classList.toggle('expanded');
    document.getElementById('dropdown-button').classList.toggle('expanded');
}

dropdown.addEventListener('wheel', (e) => {
    if (e.deltaY > 0 && dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight) e.preventDefault();
    if (e.deltaY < 0 && dropdown.scrollTop == 0) e.preventDefault();
});

dropdown.addEventListener('scroll', (e) => {
    let isScrollable = dropdown.scrollHeight > dropdown.clientHeight;
    let hasContentBelow = dropdown.scrollTop < (dropdown.scrollHeight - dropdown.clientHeight);
    if (isScrollable && hasContentBelow) {
        dropdown.classList.add('fade-bottom');
    } else {
        dropdown.classList.remove('fade-bottom');
    }

    if (dropdown.scrollTop > 0) {
        dropdown.classList.add('fade-top');
    } else {
        dropdown.classList.remove('fade-top');
    }
});

const filterHeader = (title) => `<div class="filter-header">
    <span class="filter-title">${title}</span>
    <button class="delete-filter" onclick="this.parentElement.parentElement.remove()">
        <svg fill="currentColor">
            <use href="#icon-x"></use>
        </svg>
    </button>
</div>`;

function createFilter(name, id, type) {
    let element = document.createElement('div');
    element.className = 'filter';
    element.innerHTML = filterHeader(name);

    switch (type) {
        case 'boolean': {
            element.innerHTML += `<label class="switch">
                    <input class="${id}" type="checkbox">
                    <span class="switch-slider"></span>
                </label>`
            break;
        }
        case 'text': {
            element.innerHTML += `<label class="textbox">
                    <input class="${id}" type="text">
                </label>`
            break;
        }
        case 'date': {
            element.innerHTML += `<label class="date">
                    <input class="${id}" type="datetime-local">
                </label>`
            break;
        }
    }

    return element;
}

let filters = [];
function addFilter(type) {
    let element;

    switch (type) {
        case 'Player Count': {
            element = createFilter(type, 'player-count-filter', 'text');
            break;
        }
        case 'Player Cap': {
            element = createFilter(type, 'player-cap-filter', 'text');
            break;
        }
        case 'Full': {
            element = createFilter(type, 'full-filter', 'boolean');
            break;
        }
        case 'Version': {
            element = createFilter(type, 'version-filter', 'text');
            break;
        }
        case 'Protocol': {
            element = createFilter(type, 'protocol-filter', 'text');
            break;
        }
        case 'Has Player Sample': {
            element = createFilter(type, 'has-player-sample-filter', 'boolean');
            break;
        }
        case 'Online Player': {
            element = createFilter(type, 'online-player-filter', 'text');
            break;
        }
        case 'Past Player': {
            element = createFilter(type, 'past-player-filter', 'text');
            break;
        }
        case 'Has Favicon': {
            element = createFilter(type, 'has-favicon-filter', 'boolean');
            break;
        }
        case 'Description': {
            element = createFilter(type, 'description-filter', 'text');
            break;
        }
        case 'Seen After': {
            element = createFilter(type, 'seen-after-filter', 'date');
            break;
        }
        case 'IP Subnet': {
            element = createFilter(type, 'ip-subnet-filter', 'text');
            break;
        }
        case 'Port': {
            element = createFilter(type, 'port-filter', 'text');
            break;
        }
        case 'Cracked': {
            element = createFilter(type, 'cracked-filter', 'boolean');
            break;
        }
        case 'Whitelisted': {
            element = createFilter(type, 'whitelisted-filter', 'boolean');
            break;
        }
    }

    document.getElementById('filters').appendChild(element);
}

function updateFilter() {
    args = new URLSearchParams();
    args.set('sort', 'lastSeen');
    args.set('descending', true);
    args.set('limit', limit);
    args.set('skip', 0);

    for (const item of document.getElementsByClassName('player-count-filter')) {
        let playerCount = item.value.replaceAll(' ', '');
        let minPlayers;
        let maxPlayers;
        if (playerCount.startsWith('>=')) minPlayers = parseInt(playerCount.substring(2));
        else if (playerCount.startsWith('<=')) maxPlayers = parseInt(playerCount.substring(2));
        else if (playerCount.startsWith('>')) minPlayers = parseInt(playerCount.substring(1)) + 1;
        else if (playerCount.startsWith('<')) maxPlayers = parseInt(playerCount.substring(1)) - 1;
        else if (playerCount.includes('-')) {
            const [min, max] = playerCount.split('-');
            minPlayers = parseInt(min);
            maxPlayers = parseInt(max);
        } else minPlayers = maxPlayers = parseInt(playerCount);
        if (minPlayers == maxPlayers) args.append('playerCount', minPlayers);
        else {
            console.log(minPlayers, maxPlayers)
            if (minPlayers != null) args.append('minPlayers', minPlayers);
            if (maxPlayers != null) args.append('maxPlayers', maxPlayers);
        }
    }
    for (const item of document.getElementsByClassName('player-cap-filter')) args.append('playerLimit', item.value);
    for (const item of document.getElementsByClassName('full-filter')) args.append('full', item.checked);
    for (const item of document.getElementsByClassName('version-filter')) args.append('version', item.value);
    for (const item of document.getElementsByClassName('protocol-filter')) if (!isNaN(parseInt(item.value))) args.append('protocol', parseInt(protocol(item.value)));
    for (const item of document.getElementsByClassName('has-player-sample-filter')) args.append('hasPlayerSample', item.checked);
    for (const item of document.getElementsByClassName('online-player-filter')) args.append('onlinePlayer', item.value);
    for (const item of document.getElementsByClassName('past-player-filter')) args.append('playerHistory', item.value);
    for (const item of document.getElementsByClassName('description-filter')) args.append('description', item.value);
    for (const item of document.getElementsByClassName('seen-after-filter')) args.append('seenAfter', Math.floor(new Date(item.value).getTime() / 1000));
    // const seenAfterEnabled = document.getElementById('seenAfterEnabled').checked;
    for (const item of document.getElementsByClassName('ip-subnet-filter')) {
        let minIp = [];
        let maxIp = [];
        for (let range of item.value.split(',')) {
            let [ip, subnet] = range.trim().split('/');
            ip = ip.split('.').reverse().map((a, i) => parseInt(a) * 256**i).reduce((a, b) => a + b, 0);
            if (subnet == null || subnet >= 32) args.append('ip', ip);
            else {
                minIp.push((ip & ~((1 << (32 - subnet)) - 1)) >>> 0);
                maxIp.push((ip | ((1 << (32 - subnet)) - 1)) >>> 0);
            }
        }
        args.append('minIp', JSON.stringify(minIp));
        args.append('maxIp', JSON.stringify(maxIp));
    }
    for (const item of document.getElementsByClassName('port-filter')) if (!isNaN(parseInt(item.value))) args.append('port', parseInt(item.value));
    for (const item of document.getElementsByClassName('cracked-filter')) args.append('cracked', item.checked);
    for (const item of document.getElementsByClassName('whitelisted-filter')) args.append('whitelisted', item.checked);

    console.log(args.toString());
    updateServers();
}

const cleanIp = (ip) => ('0'.repeat(8 - ip.toString(16).length) + ip.toString(16)).match(/.{1,2}/g).map(a => parseInt(a, 16)).join('.');
const sanitize = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

let loading = false;
async function updateServers(preserve = false) {
    loading = true;
    let data;
    try {
        data = await (await fetch(`https://api.cornbread2100.com/servers?${args}`)).json();
    } catch (err) {
        console.error(err);
        Array.from(document.getElementsByClassName('loading-spinner')).forEach(a => a.remove());
        return;
    }
    console.log(data);
    if (!preserve) {
        Array.from(serverList.children).forEach(a => a.remove());
        serverList.scrollTo(0, 0);
    } else Array.from(document.getElementsByClassName('loading-spinner')).forEach(a => a.remove());
    for (const server of data) {
        const serverElement = document.createElement('div')
        serverElement.className = 'server';

        const ip = document.createElement('h3');
        ip.style = 'padding-top: 20px';
        ip.innerText = `${cleanIp(server.ip)}${server.port == 25565 ? '' : `:${server.port}`}`;
        serverElement.appendChild(ip);

        const content = document.createElement('div');
        content.style = 'display: flex; overflow-wrap: break-word';
        serverElement.appendChild(content);

        const favicon = document.createElement('img');
        favicon.src = `https://ping.cornbread2100.com/favicon?ip=${server.ip}&port=${server.port}`;
        favicon.alt = 'Favicon';
        content.appendChild(favicon);

        const info = document.createElement('div');
        info.style = 'width:100%; display: grid; grid-template-columns: repeat(6, 15%); gap: 5%; grid-template-rows: repeat(6, 37px);';
        content.appendChild(info);

        const motd = document.createElement('div');
        motd.style = 'grid-area: 1 / 4 / 3 / 1; text-align: left; overflow: auto;';
        if (server.description == null) motd.innerText = '​'; // zero width space
        else if (server.description.extra != null && server.description.extra.length > 0) {
            if (server.description.extra[0].extra == null) {
                for (let i = 0; i < server.description.extra.length; i++) {
                    motd.innerText += server.description.extra[i].text;
                }
            } else {
                for (let i = 0; i < server.description.extra[0].extra.length; i++) {
                    motd.innerText += server.description.extra[0].extra[i].text;
                }
            }
        } else if (server.description.text != null) motd.innerText = server.description.text;
        else if (server.description.translate != null) motd.innerText = server.description.translate;
        else if (Array.isArray(server.description)) {
            for (var i = 0; i < server.description.length; i++) {
                motd.innerText += server.description[i].text;
            }
        } else if (server.description != null) motd.innerText = server.description;
        else motd.innerText = 'Couldn\'t get description.';
        info.appendChild(motd);

        const version = document.createElement('div');
        version.style = 'grid-area: 3 / 1 / 4 / 3; text-align: left; overflow: auto';
        version.innerText = server.version.name;
        info.appendChild(version);
        
        const lastSeen = document.createElement('div');
        lastSeen.style = 'grid-area: 1 / 4; text-align: left;';
        lastSeen.innerText = Math.floor(new Date().getTime() / 1000) - server.lastSeen < 86400 ? new Date(server.lastSeen * 1000).toLocaleTimeString() : new Date(server.lastSeen * 1000).toLocaleDateString();
        info.appendChild(lastSeen);

        const cracked = document.createElement('div');
        cracked.style = 'grid-area: 2 / 4; text-align: left;';
        cracked.innerText = `🔒 ${server.cracked == null ? 'Unknown' : server.cracked ? 'Cracked' : 'Premium'}`;
        info.appendChild(cracked);

        const playerCount = document.createElement('div');
        playerCount.style = 'grid-area: 4 / 1; text-align: left;';
        playerCount.innerText = `${server.players.online} / ${server.players.max}`;
        info.appendChild(playerCount);

        if (server.players.hasPlayerSample) {
            const playerList = document.createElement('div');
            playerList.className = 'playerlist';
            info.appendChild(playerList);
            
            const playerListText = document.createElement('div');
            playerListText.style = 'margin: 5px 10px; overflow-x: scroll; white-space: nowrap; line-height: 1.6;';
            playerList.appendChild(playerListText);
            let loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'loading-spinner';
            playerList.appendChild(loadingSpinner);

            fetch(`https://api.cornbread2100.com/playerHistory?ip=${server.ip}&port=${server.port}`)
            .then(response => response.json())
            .then(data => {
                console.log(data)
                Array.from(playerList.children).filter(a => a.className == 'loading-spinner').forEach(a => a.remove());
                if (data.length > 0) for (const player of data) {
                    console.log(player.lastSession, server.lastSeen)
                    if (player.lastSession == server.lastSeen) playerListText.innerHTML += `${playerListText.innerHTML.length > 0 ? '<br>' : ''}${sanitize(player.name)}&nbsp;&nbsp;${sanitize(player.id)}`;
                }
            })
        }

        serverList.appendChild(serverElement);
    }

    if (!preserve || data.length == limit) {
        let loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        serverList.appendChild(loadingSpinner);
    }

    loading = false;
}

let args = new URLSearchParams();
args.set('sort', 'lastSeen');
args.set('descending', true);
args.set('limit', limit);
args.set('skip', 0);
updateServers();