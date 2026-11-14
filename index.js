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

    // Botun sunucuya gönderdiği hareket/pozisyon paketlerini kalıcı olarak filtreliyoruz
    // AFK botu hareket etmeyeceği için bu paketlerin gitmesi anti-cheat'e yakalanmaktan başka işe yaramaz.
    bot._client.on('connect', () => {
        const originalWrite = bot._client.write;
        
        bot._client.write = function(name, data) {
            // Pozisyon ve görünüm paketlerini tamamen engelliyoruz (Sabit duruş garantisi)
            if (name === 'position' || name === 'position_look' || name === 'look' || name === 'steer_vehicle') {
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

        console.log("[Modules] Bot başarıyla sabitlendi, AFK modunda bekliyor...");
    });

    // Otomatik yeniden bağlanma (Auto-reconnect) mekanizması
    bot.on('end', () => {
        console.log("[Bot] Disconnected from server.");
        
        if (spawnTimeout) {
            clearTimeout(spawnTimeout);
            spawnTimeout = null;
        }

        // duplicate_login hatasını önlemek için süreyi güvenli olması adına 20 saniye yapıyoruz
        const delay = 20000; 
        console.log(`[Bot] Çakışmayı önlemek için ${delay / 1000} saniye bekleyip yeniden bağlanılacak...`);
        setTimeout(createBot, delay);
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
