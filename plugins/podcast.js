const fs = require("fs");
const path = require("path");
const { cmd } = require("../lib/command");

const file = path.join(__dirname, "../data/podcast.json");

// Charger la liste des groupes activés
function loadGroups() {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

// Sauvegarder la liste
function saveGroups(groups) {
  fs.writeFileSync(file, JSON.stringify(groups, null, 2));
}

// ✅ Commande podcast ON / OFF
cmd({
  pattern: "podcast",
  desc: "Active ou désactive le mode podcast dans un groupe",
  category: "group",
  filename: __filename
}, async (conn, m, args) => {
  const chatId = m.chat;
  let groups = loadGroups();

  if (!args[0]) {
    return await conn.sendMessage(chatId, { text: "⚙️ Utilisation : .podcast on | .podcast off" });
  }

  if (args[0] === "on") {
    if (!groups.includes(chatId)) {
      groups.push(chatId);
      saveGroups(groups);
    }
    return await conn.sendMessage(chatId, { text: "✅ Podcast activé dans ce groupe." });
  }

  if (args[0] === "off") {
    groups = groups.filter(g => g !== chatId);
    saveGroups(groups);
    return await conn.sendMessage(chatId, { text: "❌ Podcast désactivé dans ce groupe." });
  }
});

// ✅ Intercepter les messages
async function handlePodcast(conn, m) {
  const chatId = m.chat;
  const groups = loadGroups();

  if (!groups.includes(chatId)) return;
  if (m.key.fromMe) return; // éviter la boucle infinie

  // Récupérer le texte
  const text = m.body || (m.message?.conversation ?? "");

  // Répéter dans les autres groupes activés
  for (let g of groups) {
    if (g !== chatId) {
      await conn.sendMessage(g, { text: `📢 ${text}` });
    }
  }
}

module.exports = { handlePodcast };
