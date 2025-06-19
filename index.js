const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
app.use(bodyParser.json());

let pool;

async function init() {
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

    console.log("✅ Connexion à MySQL établie");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Webhook en ligne sur le port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Impossible de se connecter à MySQL :", err.message);
    process.exit(1);
  }
}

app.post('/webhook', async (req, res) => {
  const intent = req.body.queryResult?.intent?.displayName;
  const userMessage = req.body.queryResult?.queryText?.toLowerCase() || '';
  console.log("🎯 Intent reçu :", intent);

  try {
    if (intent === 'VisiteDrâaTafilalet') {
      if (!pool) {
        return res.json({ fulfillmentText: "❌ Base de données indisponible." });
      }

      const [rows] = await pool.query(`
        SELECT l.name 
        FROM attraction a
        JOIN location l ON a.id_location = l.id_location
        LIMIT 5
      `);

      const noms = rows.map(r => r.name).join(', ') || "aucune donnée";

      return res.json({
        fulfillmentText: `Voici quelques attractions à visiter à Drâa-Tafilalet : ${noms}.`
      });
    }

    if (userMessage.includes('bonjour')) {
      return res.json({ fulfillmentText: "Bonjour et bienvenue dans notre application !" });
    }

    if (userMessage.includes('bonsoir')) {
      return res.json({ fulfillmentText: "Bonsoir et bienvenue, passez une bonne soirée !" });
    }

    return res.json({ fulfillmentText: "Je n’ai pas compris, pouvez-vous reformuler ?" });

  } catch (err) {
    console.error("❌ Erreur dans webhook :", err.message);
    return res.json({ fulfillmentText: "Une erreur est survenue. Veuillez réessayer plus tard." });
  }
});

init();
