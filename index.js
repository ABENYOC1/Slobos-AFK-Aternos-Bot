const mineflayer = require('mineflayer');
const fs = require('fs');

// settings.json dosyasını okuyoruz
let rawData = fs.readFileSync('settings.json');
let settings = JSON.parse(rawData);

function createBot() {
    console.log(`[Bot] Connecting to ${settings.server.ip}:${settings.server.port}`);
    
    const botOptions = {
        host: settings.server.ip,
        port: settings.server.port,
        username: settings['bot-account'].username,
        auth: settings['bot-account'].type,
        hideErrors: true
    };

    if (settings.server.version && settings.server.version.trim() !== "") {
        botOptions.version = settings.server.version;
    }

    const bot = mineflayer.createBot(botOptions);
    let spawnTimeout = null;
    let isStabilizing = true; // İlk giriş koruma bayrağı

    // Botun sunucuya gönderdiği ağ paketlerini yakalayıp filtreliyoruz
    bot._client.on('connect', () => {
        isStabilizing = true;
        const originalWrite = bot._client.write;
        
        bot._client.write = function(name, data) {
            // İlk 3 saniye boyunca hareket ve pozisyon paketlerinin gitmesini engelle
            if (isStabilizing && (name === 'position' || name === 'position_look' || name === 'look' || name === 'steer_vehicle')) {
                return; 
            }
            return originalWrite.call(this, name, data);
        };
    });

    bot.once('spawn', () => {
        console.log(`[Bot] [+] Successfully spawned on server! (Version: ${bot.version})`);
        
        if (bot.entity) {
            bot.entity.onGround = true;
        }

        console.log("[Modules] Initializing all modules...");
        
        // 3 saniyelik kritik koruma süresi
        spawnTimeout = setTimeout(() => {
            isStabilizing = false; // Koruma kalkıyor, normal akışa dönülüyor
            console.log("[Bot] 3 saniyelik güvenlik süresi doldu, bağlantı kararlaştı!");

            if (settings.position && settings.position.enabled) {
                console.log("[Position] Navigating to configured position...");
            }

            if (settings.movement && settings.movement.enabled) {
                console.log("[Movement] Movement modules started.");
            }

        }, 3000);

        console.log("[Modules] All modules initialized!");
    });

    // Otomatik yeniden bağlanma (Auto-reconnect) mekanizması
    bot.on('end', () => {
        console.log("[Bot] Disconnected from server.");
        
        if (spawnTimeout) {
            clearTimeout(spawnTimeout);
            spawnTimeout = null;
        }

        if (settings.utils && settings.utils['auto-reconnect']) {
            const delay = settings.utils['auto-reconnect-delay'] || 10000;
            console.log(`[Bot] Reconnecting in ${delay}ms...`);
            setTimeout(createBot, delay);
        }
    });

    bot.on('kicked', (reason) => {
        console.log(`[Bot] Kicked: ${JSON.stringify(reason)}`);
    });

    bot.on('error', (err) => {
        if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
            return;
        }
        console.log(`[Bot] Error: ${err.message}`);
    });
}

// Botu başlat
createBot();
