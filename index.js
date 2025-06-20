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

// 🔍 Endpoint de test de connexion DB
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');
    res.send(`✅ Connexion réussie. Heure du serveur : ${rows[0].now}`);
  } catch (err) {
    console.error("❌ Erreur de test DB :", err.message);
    res.status(500).send("Erreur de connexion DB");
  }
});

app.post('/webhook', async (req, res) => {
  // 📩 Log de la requête complète Dialogflow
  console.log("📩 Requête complète Dialogflow :", JSON.stringify(req.body, null, 2));

  const intent = req.body.queryResult?.intent?.displayName;
  const userMessage = req.body.queryResult?.queryText?.toLowerCase() || '';
  console.log("🎯 Intent reçu :", intent);

  try {
    // Condition assouplie pour détecter l’intent "Drâa-Tafilalet"
    if (intent?.toLowerCase().includes('testdraa')) {
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
