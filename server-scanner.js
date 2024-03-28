function updateFilter() {
    mongoFilter = {};

    const playerCountEnabled = document.getElementById('playerCountEnabled').checked;
    const playerCapEnabled = document.getElementById('playerCapEnabled').checked;
    const isFullEnabled = document.getElementById('isFullEnabled').checked;
    const onlinePlayerEnabled = document.getElementById('onlinePlayerEnabled').checked;
    const versionEnabled = document.getElementById('versionEnabled').checked;
    const protocolEnabled = document.getElementById('protocolEnabled').checked;
    const hasPlayerSampleEnabled = document.getElementById('hasPlayerSampleEnabled').checked;
    const pastPlayerEnabled = document.getElementById('pastPlayerEnabled').checked;
    const descriptionEnabled = document.getElementById('descriptionEnabled').checked;
    const seenAfterEnabled = document.getElementById('seenAfterEnabled').checked;
    const ipSubnetEnabled = document.getElementById('ipSubnetEnabled').checked;
    const portEnabled = document.getElementById('portEnabled').checked;
    const crackedEnabled = document.getElementById('crackedEnabled').checked;

    const minOnline = document.getElementById('minOnline');
    const maxOnline = document.getElementById('maxOnline');
    const playerCap = document.getElementById('playerCap');
    const isFull = document.getElementById('isFull');
    const onlinePlayer = document.getElementById('onlinePlayer');
    const version = document.getElementById('version');
    const protocol = document.getElementById('protocol');
    const hasPlayerSample = document.getElementById('hasPlayerSample');
    const pastPlayer = document.getElementById('pastPlayer');
    const description = document.getElementById('description');
    const seenAfter = document.getElementById('seenAfter');
    const ipSubnet = document.getElementById('ipSubnet');
    const port = document.getElementById('port');
    const cracked = document.getElementById('cracked');

    if (playerCountEnabled) {
        if (minOnline.value == maxOnline.value) {
            if (!isNaN(parseInt(minOnline.value))) mongoFilter['players.online'] = parseInt(minOnline.value);
        } else {
            if (!isNaN(parseInt(minOnline.value))) {
                if (mongoFilter['players.online'] == null) mongoFilter['players.online'] = {};
                mongoFilter['players.online'].$gte = parseInt(minOnline.value);
            }
            if (!isNaN(parseInt(maxOnline.value))) {
                if (mongoFilter['players.online'] == null) mongoFilter['players.online'] = {};
                mongoFilter['players.online'].$lte = parseInt(maxOnline.value);
            }
        }
    }
    if (playerCapEnabled && !isNaN(parseInt(playerCap.value))) mongoFilter['players.max'] = parseInt(playerCap.value);
    if (isFullEnabled) {
        if (isFull.checked) mongoFilter['$expr'] = { '$eq': ['$players.online', '$players.max'] };
        else mongoFilter['$expr'] = { '$ne': ['$players.online', '$players.max'] };
    }
    if (onlinePlayerEnabled) mongoFilter['players.sample.name'] = onlinePlayer.value;
    if (pastPlayerEnabled) mongoFilter['players.sample.name'] = pastPlayer.value;
    if (versionEnabled) mongoFilter['version.name'] = { '$regex': version.value, '$options': 'i' };
    if (protocolEnabled && !isNaN(parseInt(protocol.value))) mongoFilter['version.protocol'] = parseInt(protocol.value);
    if (descriptionEnabled) mongoFilter['$or'] = [ {'description': {'$regex': description.value, '$options': 'i'}}, {'description.text': {'$regex': description.value, '$options': 'i'}}, { 'description.extra.text': { '$regex': description.value, '$options': 'i', } }, ];
    if (hasPlayerSampleEnabled) {
        if (mongoFilter['players.sample'] == null) mongoFilter['players.sample'] = {};
        mongoFilter['players.sample']['$exists'] = hasPlayerSample.checked;
        if (hasPlayerSample.checked) mongoFilter['players.sample']['$not'] = { '$size': 0 };
    }
    if (seenAfterEnabled) mongoFilter['lastSeen'] = { '$gte': Math.floor(new Date(seenAfter.value).getTime() / 1000) };
    if (ipSubnetEnabled) {
        const [ip, range] = ipSubnet.value.split('/');
        const ipCount = 2**(32 - range)
        const octets = ip.split('.');
        for (var i = 0; i < octets.length; i++) {
            if (256**i < ipCount) {
                var min = octets[octets.length - i - 1];
                var max = 255;
                if (256**(i + 1) < ipCount) {
                    min = 0;
                } else {
                    max = ipCount / 256;
                }
                octets[octets.length - i - 1] = `(${min}|[1-9]\\d{0,2}|[1-9]\\d{0,1}\\d|${max})`;
            }
        }

        mongoFilter['ip'] = { '$regex': `^${octets[0]}\.${octets[1]}\.${octets[2]}\.${octets[3]}\$`, '$options': 'i' }
    }
    if (portEnabled) mongoFilter['port'] = port.value;
    if (crackedEnabled) mongoFilter['cracked'] = cracked.value;

    console.log(mongoFilter)
    updateServers();
}

async function updateServers() {
    const data = await (await fetch(`https://api.cornbread2100.com/servers?query=${JSON.stringify(mongoFilter)}`)).json();
    // const data = [{ ip: '1.2.3.4', port: 25565, description: 'A Minecraft Server', version: { name: '1.20.4', protocol: 765 }, cracked: false, lastSeen: Math.floor(new Date().getTime() / 1000) - 1800, players: { online: 1, max: 20, sample: [{ id:'e6135a83-d680-39d6-b4be-65a3d8bb97ad', name: 'Dream',lastSeen: Math.floor(new Date().getTime() / 1000) - 1800 }]} }];
    console.log(data);
    const serverList = document.getElementsByClassName('serverlist')[0];
    while (serverList.children.length > 0) serverList.children[0].remove();
    for (const server of data) {
        const serverElement = document.createElement('div')
        serverElement.className = 'server';
        serverList.appendChild(serverElement);

        const ip = document.createElement('h3');
        ip.style = 'padding-top: 20px';
        ip.innerText = `${server.ip}${server.port == 25565 ? '' : `:${server.port}`}`;
        serverElement.appendChild(ip);

        const content = document.createElement('div');
        content.style = 'display: flex; overflow-wrap: break-word';
        serverElement.appendChild(content);

        const favicon = document.createElement('img');
        favicon.src = `https://ping.cornbread2100.com/favicon/?ip=${server.ip}&port=${server.port}`;
        favicon.alt = 'Favicon';
        content.appendChild(favicon);

        const info = document.createElement('div');
        info.style = 'width:100%; display: grid; grid-template-columns: repeat(6, 15%); gap: 5%; grid-template-rows: repeat(6, 37px);';
        content.appendChild(info);

        const motd = document.createElement('div');
        motd.style = 'grid-column: 1/3; text-align: left;';
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
        motd.innerText = motd.innerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        info.appendChild(motd);

        const version = document.createElement('div');
        version.style = 'grid-column: 3/4; grid-row: 1/3; text-align: left; overflow: auto';
        version.innerText = server.version.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        info.appendChild(version);

        const cracked = document.createElement('div');
        cracked.style = 'grid-column: 3; grid-row: 3; text-align: left;';
        cracked.innerText = server.cracked == null ? 'Unknown' : server.cracked ? 'Cracked' : 'Premium';
        info.appendChild(cracked);

        const lastSeen = document.createElement('div');
        lastSeen.style = 'grid-column: 3; grid-row: 4; text-align: left;';
        lastSeen.innerText = Math.floor(new Date().getTime() / 1000) - server.lastSeen < 86400 ? new Date(server.lastSeen * 1000).toLocaleTimeString() : new Date(server.lastSeen * 1000).toLocaleDateString();
        info.appendChild(lastSeen);

        const playerCount = document.createElement('div');
        playerCount.style = 'grid-column: 4; text-align: left;';
        playerCount.innerText = `${server.players.online} / ${server.players.max}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        info.appendChild(playerCount);

        const playerList = document.createElement('div');
        playerList.className = 'playerlist';
        info.appendChild(playerList);

        const playerListText = document.createElement('div');
        playerListText.style = 'margin-top: 5px; margin-bottom: 5px; margin-left: 10px; margin-right: 10px';
        if (Array.isArray(server?.players?.sample) && server.players.sample.length > 0) for (const player of server.players.sample) if (player.lastSeen == server.lastSeen) playerListText.innerText += playerListText.innerText.length > 0 ? `\n${player.name}` : `${player.name}`;
        playerListText.innerText = playerListText.innerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        playerList.appendChild(playerListText);
    }
}

let mongoFilter = { lastSeen: { $gte: Math.floor(new Date().getTime() / 1000) - 3600 }}
updateServers();