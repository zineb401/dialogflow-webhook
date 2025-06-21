// index.js complet mis à jour pour base avec classes filles au lieu d'un champ 'type'

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const translate = require('@vitalets/google-translate-api');

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
  const lang = req.body.queryResult?.languageCode || 'en';

  try {
    if (intent?.toLowerCase().includes('visite')) {
      return res.json({
        fulfillmentText:
          lang === 'fr'
            ? "Souhaitez-vous découvrir des sites historiques, naturels, culturels ou bien tous ?"
            : "Would you like to discover historical, natural, cultural sites, or all of them?",
        outputContexts: [
          {
            name: `${req.body.session}/contexts/attente_type_attraction`,
            lifespanCount: 2
          }
        ]
      });
    }

    if (intent === 'ChoixTypeAttraction') {
      let table = '';
      if (userMessage.includes('historique') || userMessage.includes('historical')) table = 'historical_attraction';
      else if (userMessage.includes('naturel') || userMessage.includes('natural')) table = 'natural_attraction';
      else if (userMessage.includes('culturel') || userMessage.includes('cultural')) table = 'cultural_attraction';
      else if (userMessage.includes('artificial') || userMessage.includes('artificial')) table = 'artificial_attraction';

      else if (userMessage.includes('tous') || userMessage.includes('all')) table = 'attraction';

      if (!table) {
        return res.json({
          fulfillmentText: lang === 'fr'
            ? "Merci de préciser un type valide : historique, naturel, culturel ou tous."
            : "Please specify a valid type: historical, natural, cultural or all."
        });
      }

      const sql = `
        SELECT l.name, l.description, i.image_url
        FROM ${table} a
        JOIN location l ON a.id_location = l.id_location
        LEFT JOIN image i ON i.id_location = l.id_location
        GROUP BY l.id_location
        LIMIT 3;
      `;

      const [rows] = await pool.query(sql);

      if (rows.length === 0) {
        return res.json({
          fulfillmentText: lang === 'fr' ? "Aucune attraction trouvée." : "No attractions found."
        });
      }

      const messages = [];
      const cards = [];

      for (const row of rows) {
        let desc = row.description;
        if (lang === 'fr') {
          try {
            const result = await translate(desc, { to: 'fr' });
            desc = result.text;
          } catch {
            desc = '[Traduction indisponible]';
          }
        }

        messages.push(`• ${row.name} : ${desc}`);

        cards.push({
          card: {
            title: row.name,
            subtitle: desc.length > 80 ? desc.substring(0, 77) + '...' : desc,
            imageUri: row.url || '',
            buttons: [
              {
                text: lang === 'fr' ? "Voir plus" : "More info",
                postback: row.url || 'https://example.com'
              }
            ]
          }
        });
      }

      return res.json({
        fulfillmentText:
          lang === 'fr'
            ? `Voici quelques attractions :\n\n${messages.join('\n\n')}`
            : `Here are some attractions:\n\n${messages.join('\n\n')}`,
        fulfillmentMessages: cards
      });
    }

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
          : "Good evening and welcome!"
      });
    }

    return res.json({
      fulfillmentText: lang === 'fr'
        ? "Je n’ai pas compris, pouvez-vous reformuler ?"
        : "I didn’t understand, could you please rephrase?"
    });

  } catch (err) {
    console.error("❌ Erreur Webhook :", err.message);
    return res.json({
      fulfillmentText: lang === 'fr'
        ? "Une erreur est survenue. Veuillez réessayer plus tard."
        : "An error occurred. Please try again later."
    });
  }
});

init();
