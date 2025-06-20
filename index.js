const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const translate = require('@vitalets/google-translate-api'); // ⬅️ Traduction dynamique

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

// Test DB (facultatif)
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
  console.log("📩 Requête complète Dialogflow :", JSON.stringify(req.body, null, 2));

  const intent = req.body.queryResult?.intent?.displayName;
  const userMessage = req.body.queryResult?.queryText?.toLowerCase() || '';
  const lang = req.body.queryResult?.languageCode || 'en';

  console.log("🎯 Intent reçu :", intent, '| Langue détectée :', lang);

  try {
    // Intent principal : VisiteDrâaTafilalet
    if (intent?.toLowerCase().includes("visite")) {
      if (!pool) {
        return res.json({ fulfillmentText: "❌ Base de données indisponible." });
      }

      const [rows] = await pool.query(`
        SELECT l.name, l.description
        FROM attraction a
        JOIN location l ON a.id_location = l.id_location
        LIMIT 5
      `);

      if (rows.length === 0) {
        return res.json({
          fulfillmentText: lang === 'fr'
            ? "Aucune attraction trouvée pour le moment."
            : "No attractions found at the moment."
        });
      }

      const results = [];

      for (const row of rows) {
        let desc = row.description;

        if (lang === 'fr') {
          try {
            const result = await translate(desc, { to: 'fr' });
            desc = result.text;
          } catch (err) {
            console.error("❌ Erreur traduction :", err.message);
            desc = "[Traduction non disponible]";
          }
        }

        results.push(`• ${row.name} : ${description}`);
      }

      const message = results.join('\n\n');

      return res.json({
        fulfillmentText:
          lang === 'fr'
            ? `Voici quelques attractions à visiter à Drâa-Tafilalet :\n\n${message}`
            : `Here are some attractions to visit in Drâa-Tafilalet:\n\n${message}`
      });
    }

    // Réponses basiques
    if (userMessage.includes('bonjour')) {
      return res.json({
        fulfillmentText: lang === 'fr'
          ? "Bonjour et bienvenue dans notre application !"
          : "Hello and welcome to our application!"
      });
    }

    if (userMessage.includes('bonsoir')) {
      return res.json({
        fulfillmentText: lang === 'fr'
          ? "Bonsoir et bienvenue, passez une bonne soirée !"
          : "Good evening and welcome! Have a nice evening!"
      });
    }

    // Fallback
    return res.json({
      fulfillmentText: lang === 'fr'
        ? "Je n’ai pas compris, pouvez-vous reformuler ?"
        : "I didn’t understand, could you please rephrase?"
    });

  } catch (err) {
    console.error("❌ Erreur dans webhook :", err.message);
    return res.json({
      fulfillmentText: lang === 'fr'
        ? "Une erreur est survenue. Veuillez réessayer plus tard."
        : "An error occurred. Please try again later."
    });
  }
});

init();
