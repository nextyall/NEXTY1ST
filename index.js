const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    } else if (connection === "open") {
      console.log("✅ Bot connected!")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || !m.key.remoteJid) return
    const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
    const command = body.startsWith(".") ? body.slice(1).trim().split(" ")[0].toLowerCase() : null
    const text = body.split(" ").slice(1).join(" ")

    if (!command) return

    // MENU
    if (command === "menu") {
      let menu = `
┏━━━❖ *𓆩 𝚴𝚵𝚾𝚻𝐘 𓆪* ❖━━━┓
┃ 👑 *Owner* : 923192084504
┃ ⌨️ *Prefix* : [ . ]
┃ ☁️ *Host*   : Heroku
┃ ⚙️ *Mode*   : Public
┃
┃ 📌 *Commands List*:
┃ ➤ .ping     ⟶ Bot Response Test
┃ ➤ .jid      ⟶ Chat JID Show
┃ ➤ .g        ⟶ Group JID Show
┃ ➤ .forward <jid> ⟶ Forward Message
┗━━━━━━━━━━━━━━━━━━┛
`
      // Pehle menu text bhejega
      await sock.sendMessage(m.key.remoteJid, { text: menu }, { quoted: m })

      // Uske baad voice note bhejega
      await sock.sendMessage(m.key.remoteJid, { 
        audio: { url: "https://files.catbox.moe/9j4qg6.mp3" }, 
        mimetype: "audio/mp4", 
        ptt: true 
      }, { quoted: m })
    }

    // PING
    if (command === "ping") {
      let start = Date.now()
      let sent = await sock.sendMessage(m.key.remoteJid, { text: "Pong!" }, { quoted: m })
      let end = Date.now()
      await sock.sendMessage(m.key.remoteJid, { text: `Response Time: ${end - start} ms` }, { quoted: sent })
    }

    // JID
    if (command === "jid") {
      await sock.sendMessage(m.key.remoteJid, { text: `🔑 JID: ${m.key.remoteJid}` }, { quoted: m })
    }

    // G (Group JID)
    if (command === "g") {
      if (m.key.remoteJid.endsWith("@g.us")) {
        await sock.sendMessage(m.key.remoteJid, { text: `👥 Group JID: ${m.key.remoteJid}` }, { quoted: m })
      } else {
        await sock.sendMessage(m.key.remoteJid, { text: "❌ Yeh command sirf group me chalega!" }, { quoted: m })
      }
    }

    // FORWARD
    if (command === "forward") {
      if (!text) return sock.sendMessage(m.key.remoteJid, { text: "❌ JID likho jahan forward karna hai" }, { quoted: m })
      if (!m.message.extendedTextMessage?.contextInfo?.stanzaId) return sock.sendMessage(m.key.remoteJid, { text: "❌ Kisi message ko reply
