const Infraction = require("../models/Infraction");

// 🔑 Liste des mots-clés par article
const rules = {
  13: ["injure", "insulte", "haine", "colère", "porno"],
  14: ["lien", "publicité", "arnaque", "discussion hors sujet"],
  15: ["décryptage", "cracker", "casser fichier"],
  19: ["inbox admin", "écrire admin", "contacter fondateur"],
  20: ["chef"], // exemple, peut être adapté
  21: ["vente connexion", "revendre internet"],
  22: ["vente host", "vente vpn", "vente fichier"],
};

module.exports = {
  name: "rules",
  description: "Vérifie les messages selon le règlement intérieur",
  async execute(sock, m, args) {
    try {
      const message = (m.body || "").toLowerCase();
      const userId = m.sender;
      const groupId = m.chat;

      let violatedArticles = [];

      // Vérifie si le message contient un mot interdit
      for (const [article, keywords] of Object.entries(rules)) {
        for (const keyword of keywords) {
          if (message.includes(keyword)) {
            violatedArticles.push(article);
          }
        }
      }

      if (violatedArticles.length > 0) {
        let infraction = await Infraction.findOne({ userId, groupId });

        if (!infraction) {
          infraction = new Infraction({ userId, groupId });
        }

        infraction.warnings += 1;
        infraction.articles.push(...violatedArticles);
        infraction.lastUpdated = new Date();
        await infraction.save();

        if (infraction.warnings < 3) {
          await sock.sendMessage(groupId, {
            text: `⚠️ @${userId.split("@")[0]} a reçu un avertissement.\nArticles violés: ${violatedArticles.join(", ")}.\nNombre d'avertissements: ${infraction.warnings}/3`,
            mentions: [userId],
          });
        } else {
          await sock.groupParticipantsUpdate(groupId, [userId], "remove");

          await sock.sendMessage(groupId, {
            text: `❌ @${userId.split("@")[0]} a été supprimé du groupe après 3 avertissements.\nArticles violés: ${infraction.articles.join(", ")}`,
            mentions: [userId],
          });

          // Notifier les admins (remplace ADMIN_ID par l’ID de ton admin ou groupe admin)
          const ADMIN_ID = "120XXXXXXXXXX@g.us";
          await sock.sendMessage(ADMIN_ID, {
            text: `🚨 Membre supprimé: @${userId.split("@")[0]}\nGroupe: ${groupId}\nArticles violés: ${infraction.articles.join(", ")}`,
            mentions: [userId],
          });

          await Infraction.deleteOne({ userId, groupId }); // Reset après expulsion
        }
      }
    } catch (err) {
      console.error("Erreur dans rules.js:", err);
    }
  },
};
