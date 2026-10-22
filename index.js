const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req,res)=> res.send('BotDinzz Aktif!'));

// API BUAT APK LU - GENERATE KODE 8 DIGIT
app.get('/pair', async (req,res)=>{
    let number = (req.query.number || '').replace(/[^0-9]/g,'');
    if(!number) return res.json({error: 'Nomor kosong'});
    if(!number.startsWith('62')) number = '62' + number.replace(/^0/,'');

    try{
        const dir = './session/'+number;
        if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
        const {state, saveCreds} = await useMultiFileAuthState(dir);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: P({level:'silent'}),
            browser: ['BotDinzz','Chrome','1.0']
        });

        sock.ev.on('creds.update', saveCreds);

        if(!state.creds.registered){
            await new Promise(r=>setTimeout(r,2000));
            let code = await sock.requestPairingCode(number);
            console.log('CODE BOTDINZZ:', code);
            return res.json({code: code, number: number});
        } else {
            return res.json({message: 'Nomor sudah terhubung', number: number});
        }
    }catch(e){
        console.log(e);
        res.json({error: e.message});
    }
});

// BOT JALAN - AUTO REPLY SIMPLE
async function startBot(number){
    const dir = './session/'+number;
    if(!fs.existsSync(dir)) return;
    const {state, saveCreds} = await useMultiFileAuthState(dir);
    const sock = makeWASocket({auth:state, logger: P({level:'silent'}), browser:['BotDinzz','Chrome','1.0']});
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async ({messages})=>{
        let m = messages[0];
        if(!m.message) return;
        let text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        if(text.toLowerCase() == 'menu'){
            await sock.sendMessage(m.key.remoteJid, {text: 'Halo! Ini BotDinzz V1 aktif 🤖\n\nKetik: menu, ping, bot'});
        }
        if(text.toLowerCase() == 'ping'){
            await sock.sendMessage(m.key.remoteJid, {text: 'Pong! BotDinzz Online ✅'});
        }
    });
}

app.listen(PORT, ()=> console.log('BotDinzz jalan di port '+PORT));
