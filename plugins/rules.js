const { writeFileSync, readFileSync, existsSync } = require("fs");
const dbPath = "./database/rules.json";

// Charger ou créer la base
function loadDB() {
  if (!existsSync(dbPath)) return {};
  return JSON.parse(readFileSync(dbPath));
}
function saveDB(db) {
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// 🔑 Liste des mots-clés par article
const rules = {
  13: ["injure", "insulte", "haine", "porno"],
  14: ["lien", "publicité", "arnaque"],
  15: ["cracker", "casser fichier"],
  19: ["inbox admin", "contacter fondateur"],
  21: ["vente connexion", "revendre internet"],
  22: ["vente host", "vpn", "fichier piraté"],
};

module.exports = {
  name: "rules",
  description: "Vérifie les messages selon le règlement",
  async execute(sock, m) {
    try {
      const message = (m.body || "").toLowerCase();
      const userId = m.sender;
      const groupId = m.chat;

      let violatedArticles = [];

      for (const [article, keywords] of Object.entries(rules)) {
        for (const keyword of keywords) {
          if (message.includes(keyword)) violatedArticles.push(article);
        }
      }

      if (violatedArticles.length > 0) {
        let db = loadDB();
        if (!db[groupId]) db[groupId] = {};
        if (!db[groupId][userId]) db[groupId][userId] = { warns: 0, articles: [] };

        db[groupId][userId].warns += 1;
        db[groupId][userId].articles.push(...violatedArticles);
        saveDB(db);

        if (db[groupId][userId].warns < 3) {
          await sock.sendMessage(groupId, {
            text: `⚠️ @${userId.split("@")[0]} a reçu un avertissement.\nArticles violés: ${violatedArticles.join(", ")}.\nNombre d'avertissements: ${db[groupId][userId].warns}/3`,
            mentions: [userId],
          });
        } else {
          await sock.groupParticipantsUpdate(groupId, [userId], "remove");

          await sock.sendMessage(groupId, {
            text: `❌ @${userId.split("@")[0]} a été supprimé après 3 avertissements.\nArticles violés: ${db[groupId][userId].articles.join(", ")}`,
            mentions: [userId],
          });

          delete db[groupId][userId]; // Reset après expulsion
          saveDB(db);
        }
      }
    } catch (e) {
      console.error("Erreur rules.js :", e);
    }
  },
};
