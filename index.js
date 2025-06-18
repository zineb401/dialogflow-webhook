const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // utilise mysql2 en mode "promesse"

const app = express();
app.use(bodyParser.json());

// 🔌 Création d'un pool sécurisé
let pool;

(async () => {
  try {
    pool = await mysql.createPool({
      host: 'maglev.proxy.rlwy.net',
      port: 22379,
      user: 'root',
      password: 'zEPZfycyLXbImGgyrtccyfiJNQxGEygZ',
      database: 'railway',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log("✅ Connexion à la base Railway réussie");
  } catch (err) {
    console.error("❌ Échec de la connexion MySQL :", err.message);
  }
})();

// 🎯 Webhook Dialogflow
app.post('/webhook', async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;
  const userMessage = req.body.queryResult.queryText.toLowerCase();

  console.log("➡️ Intent reçu :", intent);

  try {
    if (intent === 'VisiteDrâaTafilalet') {
      if (!pool) {
        return res.json({ fulfillmentText: "Base de données indisponible." });
      }

      const [rows] = await pool.query('SELECT name FROM attractions LIMIT 5');

      if (rows.length === 0) {
        return res.json({ fulfillmentText: 'Aucune attraction trouvée.' });
      }

      const noms = rows.map(r => r.name).join(', ');
      return res.json({
        fulfillmentText: `Voici quelques attractions à visiter à Drâa-Tafilalet : ${noms}.`
      });

    } else if (userMessage.includes('bonjour')) {
      return res.json({ fulfillmentText: 'Bonjour et bienvenue dans notre application !' });

    } else if (userMessage.includes('bonsoir')) {
      return res.json({ fulfillmentText: 'Bonsoir et bienvenue, passez une bonne soirée !' });

    } else {
      return res.json({ fulfillmentText: "Je n’ai pas compris, pouvez-vous reformuler ?" });
    }

  } catch (err) {
    console.error("❌ Erreur dans /webhook :", err.message);
    return res.json({ fulfillmentText: "Une erreur s'est produite. Réessaie plus tard." });
  }
});

// 🚀 Démarrage serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook lancé sur le port ${PORT}`);
});
