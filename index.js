const mineflayer = require('mineflayer');
const fs = require('fs');

// settings.json dosyasını okuyoruz
let rawData = fs.readFileSync('settings.json');
let settings = JSON.parse(rawData);

function createBot() {
    console.log(`[Bot] Connecting to ${settings.server.ip}:${settings.server.port}`);
    
    // Sürüm ayarı boş ise otomatik algılatılır
    const botOptions = {
        host: settings.server.ip,
        port: settings.server.port,
        username: settings['bot-account'].username,
        auth: settings['bot-account'].type
    };

    if (settings.server.version && settings.server.version.trim() !== "") {
        botOptions.version = settings.server.version;
    }

    const bot = mineflayer.createBot(botOptions);

    bot.once('spawn', () => {
        console.log(`[Bot] [+] Successfully spawned on server! (Version: ${bot.version})`);
        console.log("[Modules] Initializing all modules...");
        
        // Anti-cheat korumasını aşmak için sunucuya girdikten sonra 3 saniye bekliyoruz
        setTimeout(() => {
            console.log("[Bot] 3 saniyelik güvenlik süresi doldu, modüller aktifleşiyor!");

            // Konum (Position) ayarları aktifse uygula
            if (settings.position && settings.position.enabled) {
                console.log("[Position] Navigating to configured position...");
                // Konum yönlendirme kodunuz buraya gelebilir
            }

            // Hareket (Movement) modülleri aktifse başlat
            if (settings.movement && settings.movement.enabled) {
                console.log("[Movement] Movement modules started.");
            }

        }, 3000); // 3000 milisaniye = 3 saniye

        console.log("[Modules] All modules initialized!");
    });

    // Otomatik yeniden bağlanma (Auto-reconnect) mekanizması
    bot.on('end', () => {
        console.log("[Bot] Disconnected from server.");
        if (settings.utils && settings.utils['auto-reconnect']) {
            const delay = settings.utils['auto-reconnect-delay'] || 2000;
            console.log(`[Bot] Reconnecting in ${delay}ms...`);
            setTimeout(createBot, delay);
        }
    });

    bot.on('kicked', (reason) => {
        console.log(`[Bot] Kicked: ${JSON.stringify(reason)}`);
    });

    bot.on('error', (err) => {
        console.log(`[Bot] Error: ${err.message}`);
    });
}

// Botu başlat
createBot();
