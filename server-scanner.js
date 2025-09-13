const limit = 20;
let searchButton = document.getElementById('search-button');
let serverList = document.getElementById('server-list');
let howItWorks = document.getElementById('how-it-works');
serverList.addEventListener('wheel', async (e) => {
    if (e.deltaY > 0 && serverList.scrollHeight - (serverList.scrollTop + serverList.clientHeight) <= 50) {
        if (!(loading || done)) {
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

const filterHeader = (title, info) => `<div class="filter-header">
    <span class="filter-title disable-select">${title}</span>
    <button class="delete-filter" onclick="removeFilter(this.parentElement.parentElement)">
        <svg fill="currentColor">
            <use href="#icon-x"></use>
        </svg>
    </button>
    <button class="filter-info">
        <svg fill="currentColor">
            <use href="#icon-info"></use>
        </svg>
        <span class="info-text">${info}</span>
    </button>
</div>`;

function createFilter(name, id, info, type, placeholder = '') {
    if (typeof placeholder == 'function') placeholder = placeholder();
    let element = document.createElement('div');
    element.className = 'filter';
    element.innerHTML = filterHeader(name, info);

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
                    <input class="${id}" type="text" placeholder="${placeholder}">
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

function removeFilter(filter) {
    for (let element of [searchButton, serverList, howItWorks].concat(Array.from(filterContainer.children).slice(Array.from(filterContainer.children).indexOf(filter) + 1))) {
        if (filterContainer.children.length == 2) element.style.setProperty('--raise-distance', '-104px');
        else element.style.setProperty('--raise-distance', '-94px');
        element.classList.add('raise');
    }
    filter.classList.remove('fade-in', 'lower');
    filter.classList.add('remove-filter');
}

let filterContainer = document.getElementById('filters');
let usernames = ['Steve', 'Notch', 'jeb_'];
let filterQueue = [];
function addFilter(type) {
    let element;

    switch (type) {
        case 'Player Count': {
            element = createFilter(type, 'player-count-filter', 'How many players are on the server<br>Ex: <code>3</code>, <code>>1</code>, <code><=5</code>, <code>1-10</code>', 'text', '>0');
            break;
        }
        case 'Player Cap': {
            element = createFilter(type, 'player-cap-filter', 'The player capacity of the server', 'text', '20');
            break;
        }
        case 'Full': {
            element = createFilter(type, 'full-filter', 'Whether or not the amount of players online has reached the server\'s max player capacity', 'boolean');
            break;
        }
        case 'Version': {
            element = createFilter(type, 'version-filter', 'Which Minecraft version the server is running<br>Note that this is frequently modified by third-party server software (e.g. "Paper 1.21.4").<br>This filter uses PostgreSQL\'s LIKE operator, allowing you to use wildcard characters as described <a target="_blank" href="https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-LIKE">here</a>.<br>Ex: <code>Paper:%</code>, <code>1.21._</code>, <code>%1.21.4%</code>', 'text', '%1.21.7%');
            break;
        }
        case 'Protocol': {
            element = createFilter(type, 'protocol-filter', 'Which protocol version the server is using<br>This is typically used to tell the actual underlying version of a server if they use a custom version name.<br>A list of all protocol versions can be found <a target="_blank" href="https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Protocol_version_numbers">here</a>', 'text', '772');
            break;
        }
        case 'Has Player Sample': {
            element = createFilter(type, 'has-player-sample-filter', 'Whether or not the server returns a list of online players in its ping response (the list shown when hovering over the player count in the multiplayer menu in-game)<br>This list is used for the Online Player and Past Player filters.', 'boolean');
            break;
        }
        case 'Online Player': {
            element = createFilter(type, 'online-player-filter', 'Finds a server that the player was playing on the last time it was pinged<br>This uses the server\'s player sample, which isn\'t always reliable. The vanilla Minecraft server limits this list to 12 players at a time, so any others simply won\'t be seen. This is also frequently modified to show custom messages rather than players.', 'text', () => usernames[Math.floor(Math.random() * usernames.length)]);
            break;
        }
        case 'Past Player': {
            element = createFilter(type, 'past-player-filter', 'Finds a server that the player has been seen playing on before<br>This uses the server\'s player sample, which isn\'t always reliable. The vanilla Minecraft server limits this list to 12 players at a time, so any others simply won\'t be seen. This is also frequently modified to show custom messages rather than players.', 'text', () => usernames[Math.floor(Math.random() * usernames.length)]);
            break;
        }
        case 'Has Favicon': {
            element = createFilter(type, 'has-favicon-filter', 'Whether or not the server uses a custom favicon (the image shown on the multiplayer menu)', 'boolean');
            break;
        }
        case 'Description': {
            element = createFilter(type, 'description-filter', 'The server\'s description/"message of the day" (the text shown below its name in the multiplayer menu)<br>By default this filter searches for descriptions with similar words, regardless of order. To search for an exact word or phrase, wrap it in double quotes.<br>Ex: <code>A "Minecraft Server"</code>', 'text', 'A Minecraft Server');
            break;
        }
        case 'Seen After': {
            element = createFilter(type, 'seen-after-filter', 'How recently the server has responded to a ping<br>The more recent this date is, the more likely the server is to be online.', 'date');
            break;
        }
        case 'IP Subnet': {
            element = createFilter(type, 'ip-subnet-filter', 'Searches for servers whose IPv4 addresses are within the given subnet', 'text', '1.2.3.4, 1.0.0.0/8');
            break;
        }
        case 'Port': {
            element = createFilter(type, 'port-filter', 'The server\'s port', 'text', '25565');
            break;
        }
        case 'Cracked': {
            element = createFilter(type, 'cracked-filter', 'If true, the server does not require account authentication to join<br>Note: servers are checked for authentication through a separate process from the typical SLP scanner. The authentication scanner is run much less often than the main scanner, and it isn\'t always reliable. This means that by using this filter you may be losing new servers that haven\'t been checked yet.', 'boolean');
            break;
        }
        case 'Whitelisted': {
            element = createFilter(type, 'whitelisted-filter', 'If true, the server only allows certain accounts to join the server, preventing unknown users from joining<br>Note: servers are checked for a whitelist through a separate process from the typical SLP scanner. Due to Mojang API rate limits, the whitelist scanner is incredibly slow by comparison, so only a small fraction of servers get scanned. It\'s only recommended to use this scanner if you\'re in a rush and don\'t have time to check for whitelists manually.', 'boolean');
            break;
        }
    }

    element.addEventListener('animationend', (a) => {
        switch (a.animationName) {
            case 'fade-in': {
                element.classList.remove('fade-in');
                break;
            }
            case 'lower-filter': {
                element.classList.remove('lower');
                break;
            }
            case 'raise-filter': {
                element.classList.remove('raise');
                break;
            }
            case 'remove-filter': {
                element.remove();
                break;
            }
        }
    });

    filterQueue.push(element);
}


[searchButton, serverList, howItWorks].map(a =>
    a.addEventListener('animationend', (b) => {
        switch (b.animationName) {
            case 'lower-filter': {
                a.classList.remove('lower');
                break;
            }
            case 'raise-filter': {
                a.classList.remove('raise');
                break;
            }
        }
    })
)

setInterval(() => {
    if (filterQueue.length == 0) return;
    if (document.getElementsByClassName('filter lower').length > 0) return;
    let filter = filterQueue.splice(0, 1)[0];
    filter.classList.add('fade-in');
    for (let element of [searchButton, serverList, howItWorks].concat(Array.from(filterContainer.children).slice(1))) element.classList.add('lower');
    if (filterContainer.children.length == 1) filterContainer.appendChild(filter);
    else filterContainer.insertBefore(filter, filterContainer.children[1]);
});

function updateFilter() {
    args = new URLSearchParams();
    args.set('sort', 'lastSeen');
    args.set('descending', true);
    args.set('limit', limit);
    args.set('skip', 0);

    for (const item of document.getElementsByClassName('player-count-filter')) {
        let playerCount = item.value || item.placeholder;
        let minPlayers;
        let maxPlayers;
        if (playerCount.startsWith('>=')) minPlayers = playerCount.substring(2);
        else if (playerCount.startsWith('<=')) maxPlayers = playerCount.substring(2);
        else if (playerCount.startsWith('>')) minPlayers = playerCount.substring(1);
        else if (playerCount.startsWith('<')) maxPlayers = playerCount.substring(1);
        else if (playerCount.includes('-')) {
            const [min, max] = playerCount.split('-');
            minPlayers = min;
            maxPlayers = max;
        } else minPlayers = maxPlayers = playerCount;
        
        if (isNaN(minPlayers)) {
            error(`Invalid player count filter ("${minPlayers}" is not a number)`);
            return;
        }
        if (isNaN(maxPlayers)) {
            error(`Invalid player count filter ("${maxPlayers}" is not a number)`);
            return;
        }

        if (minPlayers != null) minPlayers = parseInt(minPlayers);
        if (maxPlayers != null) maxPlayers = parseInt(maxPlayers);
        if (playerCount.startsWith('>')) minPlayers++;
        if (playerCount.startsWith('<')) maxPlayers--;

        if (minPlayers == maxPlayers) args.append('playerCount', minPlayers);
        else {
            if (minPlayers != null) args.append('minPlayers', minPlayers);
            if (maxPlayers != null) args.append('maxPlayers', maxPlayers);
        }
    }
    for (const item of document.getElementsByClassName('player-cap-filter')) {
        if (isNaN(parseInt(item.value || item.placeholder))) {
            error(`Invalid player limit filter ("${item.value || item.placeholder}" is not a number)`)
            return;
        }
        args.append('playerLimit', item.value || item.placeholder);
    }
    for (const item of document.getElementsByClassName('full-filter')) args.append('full', item.checked);
    for (const item of document.getElementsByClassName('version-filter')) args.append('version', item.value || item.placeholder);
    for (const item of document.getElementsByClassName('protocol-filter')) {
        if (isNaN(parseInt(item.value || item.placeholder))) {
            error(`Invalid protocol filter ("${item.value || item.placeholder}" is not a number)`);
            return;
        }
        args.append('protocol', parseInt(item.value || item.placeholder));
    }
    for (const item of document.getElementsByClassName('has-player-sample-filter')) args.append('hasPlayerSample', item.checked);
    for (const item of document.getElementsByClassName('online-player-filter')) args.append('onlinePlayer', item.value || item.placeholder);
    for (const item of document.getElementsByClassName('past-player-filter')) args.append('playerHistory', item.value || item.placeholder);
    for (const item of document.getElementsByClassName('description-filter')) {
        let value = item.value || item.placeholder;
        let segments = [''];
        let escaped = false;
        for (let i = 0; i < value.length; i++) {
            if (!escaped) {
                if (value[i] == '\\') {
                    escaped = true;
                    continue;
                }
                if (value[i] == '"') {
                    segments.push('');
                    continue;
                }
            }
            segments[segments.length - 1] += value[i];
            escaped = false;
        }
        let quotes = segments.filter((a, i) => i % 2 == 1 && (i != segments.length - 1 || segments.length % 2 == 1));
        if (quotes.length > 0) args.append('description', `%${quotes.join('%')}%`);
        if (segments.filter((a, i) => i % 2 == 0 || !(i != segments.length - 1 || segments.length % 2 == 1)).join('').length > 0) args.append('descriptionVector', segments.join(''));
    }
    for (const item of document.getElementsByClassName('seen-after-filter')) args.append('seenAfter', Math.floor(new Date(item.value).getTime() / 1000));
    for (const item of document.getElementsByClassName('ip-subnet-filter')) {
        let minIp = [];
        let maxIp = [];
        for (let range of (item.value || item.placeholder).split(',')) {
            let [ip, subnet] = range.trim().split('/');
            if (ip.split('.').length != 4 || isNaN(parseInt(subnet))) {
                error(`Invalid ip subnet filter ("${range}" is not a valid ip or subnet)`)
                return;
            }
            ip = ip.split('.').reverse().map((a, i) => parseInt(a) * 256**i).reduce((a, b) => a + b, 0);
            if (subnet == null || subnet >= 32) {
                if (isNaN(ip)) {
                    error(`Invalid ip subnet filter ("${range.trim().split('/')[0]}" is not a valid ip)`)
                    return;
                }
                args.append('ip', ip);
            } else {
                minIp.push((ip & ~((1 << (32 - subnet)) - 1)) >>> 0);
                maxIp.push((ip | ((1 << (32 - subnet)) - 1)) >>> 0);
                
                if (isNaN(minIp) || isNaN(maxIp)) {
                    error(`Invalid player count filter ("${range}" is not a valid ip or subnet)`)
                    return;
                }
            }
        }
        
        if (minIp.length > 0) args.append('minIp', JSON.stringify(minIp));
        if (maxIp.length > 0) args.append('maxIp', JSON.stringify(maxIp));
    }
    for (const item of document.getElementsByClassName('port-filter')) {
        if (isNaN(parseInt(item.value || item.placeholder))) {
            error(`Invalid port filter ("${item.value || item.placeholder}" is not a number)`);
            return;
        }
        args.append('port', parseInt(item.value || item.placeholder));
    }
    for (const item of document.getElementsByClassName('cracked-filter')) args.append('cracked', item.checked);
    for (const item of document.getElementsByClassName('whitelisted-filter')) args.append('whitelisted', item.checked);

    updateServers();
}

const cleanIp = (ip) => ('0'.repeat(8 - ip.toString(16).length) + ip.toString(16)).match(/.{1,2}/g).map(a => parseInt(a, 16)).join('.');
const sanitize = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function addLoadingSpinner() {
    let loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    serverList.appendChild(loadingSpinner);
    return loadingSpinner
}

let loading = false;
let done = false;
async function updateServers(preserve = false) {
    loading = true;
    if  (preserve) Array.from(document.getElementsByClassName('loading-spinner')).forEach(a => a.remove());
    else {
        done = false;
        Array.from(serverList.children).forEach(a => a.remove());
        serverList.scrollTo(0, 0);
    }
    let loadingSpinner = addLoadingSpinner();
    
    let response;
    let data;
    try {
        response = await fetch(`https://api.cornbread2100.com/v1/servers?${args}`);
        data = await response.json();
    } catch (err) {
        loadingSpinner.remove();
        error('API request failed');
        console.error(err);
        Array.from(document.getElementsByClassName('loading-spinner')).forEach(a => a.remove());
        return;
    }
    loadingSpinner.remove();

    switch(response.status) {
        case 200: {
            break;
        }
        case 429: {
            let time = (60 * 60) - (Math.floor(Date.now() / 1000) % (60 * 60));
            let minutes = Math.floor(time / 60).toLocaleString('en-US', { minimumIntegerDigits: 2 });
            let seconds = (time % 60).toLocaleString('en-US', { minimumIntegerDigits: 2 });
            let alert = error(`Rate limit reached, try again in ${minutes}:${seconds}`);
            let int = setInterval(() => {
                if (alert.classList.contains('remove')) return clearInterval(int);
                let time = (60 * 60) - (Math.floor(Date.now() / 1000) % (60 * 60));
                let minutes = Math.floor(time / 60).toLocaleString('en-US', { minimumIntegerDigits: 2 });
                let seconds = (time % 60).toLocaleString('en-US', { minimumIntegerDigits: 2 });
                alert.getElementsByClassName('message')[0].innerText = `Rate limit reached, try again in ${minutes}:${seconds}`;
            }, 1000);
            return;
        }
        case 500: {
            error(`Error processing query`);
            return;
        }
        case 504: {
            error(`Query timeout`);
            return;
        }
        default: {
            error(`HTTP ${response.status}`);
            return;
        }
    }
    if (data.error) {
        error(data.error);
        return;
    }

    for (const server of data.data) {
        const serverElement = document.createElement('div')
        serverElement.className = 'server';

        const ip = document.createElement('h2');
        ip.style = 'text-decoration: underline;';
        ip.innerText = `${cleanIp(server.ip)}${server.port == 25565 ? '' : `:${server.port}`}`;
        serverElement.appendChild(ip);

        const content = document.createElement('div');
        content.style = 'display: flex; overflow-wrap: break-word';
        serverElement.appendChild(content);

        const favicon = document.createElement('img');
        favicon.src = `https://ping.cornbread2100.com/favicon?ip=${server.ip}&port=${server.port}&errors=false`;
        favicon.alt = 'Favicon';
        content.appendChild(favicon);

        const info = document.createElement('div');
        info.style = 'width:100%; display: grid; grid-template-columns: repeat(4, 15%); gap: 5%; grid-template-rows: repeat(4, 37px);';
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
        lastSeen.style = 'grid-area: 1 / 4 / 1 / 6; text-align: left;';
        lastSeen.innerText = `Last seen at ${Math.floor(new Date().getTime() / 1000) - server.lastSeen < 86400 ? new Date(server.lastSeen * 1000).toLocaleTimeString() : new Date(server.lastSeen * 1000).toLocaleDateString()}`;
        info.appendChild(lastSeen);

        const cracked = document.createElement('div');
        cracked.style = 'grid-area: 2 / 4 / 2 / 6; text-align: left;';
        cracked.innerText = `🔒 ${server.cracked == null ? 'Unknown' : server.cracked ? 'Cracked' : 'Premium'}`;
        info.appendChild(cracked);

        const playerCount = document.createElement('div');
        playerCount.style = 'grid-area: 4 / 1 / 4 / 3; text-align: left;';
        playerCount.innerText = `${server.players.online} / ${server.players.max}`;
        info.appendChild(playerCount);

        if (server.players.hasPlayerSample) {
            const playerList = document.createElement('div');
            playerList.className = 'playerlist';
            info.appendChild(playerList);
            
            const playerListText = document.createElement('div');
            playerListText.style = 'margin: 5px 10px; overflow-x: scroll; white-space: nowrap; line-height: 1.6; height: 100%; width: 100%;';
            playerList.appendChild(playerListText);
            let loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'loading-spinner';
            playerList.appendChild(loadingSpinner);

            fetch(`https://api.cornbread2100.com/v1/playerHistory?ip=${server.ip}&port=${server.port}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.log(data);
                    return;
                }
                Array.from(playerList.children).filter(a => a.className == 'loading-spinner').forEach(a => a.remove());
                data = data.data.filter(a => a.lastSession == server.lastSeen);
                if (data.length == 0) {
                    playerList.remove();
                    return;
                }
                for (const player of data) playerListText.innerHTML += `${playerListText.innerHTML.length > 0 ? '<br>' : ''}${sanitize(player.name)}&nbsp;&nbsp;${sanitize(player.id)}`;
            })
        }

        serverList.appendChild(serverElement);
    }

    if (data.data.length == limit) {
        let loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        serverList.appendChild(loadingSpinner);
    } else done = true;

    loading = false;
}

let args = new URLSearchParams();
args.set('sort', 'lastSeen');
args.set('descending', true);
args.set('limit', limit);
args.set('skip', 0);
updateServers();

let errorContainer = document.getElementById('error-container');
let errorQueue = [];
function error(message, header = 'Error') {
    let error = document.createElement('div');
    error.classList.add('error', 'alert');
    error.innerHTML = `
            <button class="delete-error" onclick="this.parentElement.classList.add('remove')">
                <svg fill="currentColor">
                    <use href="#icon-x"></use>
                </svg>
            </button>
            <strong>${header}</strong>
            <br>
            <span class="message">${message}</span>
        `;
    error.addEventListener('animationend', (a) => {
        switch (a.animationName) {
            case 'alert': {
                error.classList.remove('alert');
                break;
            }
            case 'raise-alert': {
                error.classList.remove('raise');
                break;
            }
            case 'remove-alert': {
                error.remove();
                break;
            }
        }
    });
    errorQueue.push(error);
    return error;
}

setInterval(() => {
    if (errorQueue.length == 0) return;
    if (document.getElementsByClassName('error alert').length > 0 || document.getElementsByClassName('raise').length > 0) return;
    let error = errorQueue.splice(0, 1)[0];
    for (let element of errorContainer.children) element.classList.add('raise');
    errorContainer.appendChild(error);
    setTimeout(() => error.classList.add('remove'), 10000);
});