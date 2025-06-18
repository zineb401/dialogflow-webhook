const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
app.use(bodyParser.json());

// 🔌 Connexion à ta base MySQL Railway
const db = mysql.createConnection({
  host: 'maglev.proxy.rlwy.net', // ou mysql-production-xxxx.up.railway.app selon ta config
  port: 22379, // remplace par le bon port si différent
  user: 'root',
  password: 'zEPZfycyLXbImGgyrtccyfiJNQxGEygZ',
  database: 'railway'
});

db.connect(err => {
  if (err) {
    console.error('❌ Erreur connexion MySQL:', err);
  } else {
    console.log('✅ Connecté à MySQL Railway');
  }
});

// 🎯 Endpoint Dialogflow Webhook
app.post('/webhook', (req, res) => {
  const intent = req.body.queryResult.intent.displayName;
  console.log('➡️ Intent détecté :', intent);

  // 👉 Intent : visiter Drâa-Tafilalet
  if (intent === 'VisiteDrâaTafilalet') {
    const sql = "SELECT name FROM attractions LIMIT 5";

    db.query(sql, (err, results) => {
      if (err) {
        console.error('Erreur SQL:', err);
        return res.json({ fulfillmentText: 'Erreur lors de la récupération des attractions.' });
      }

      if (results.length === 0) {
        return res.json({ fulfillmentText: 'Aucune attraction trouvée.' });
      }

      const noms = results.map(r => r.name).join(', ');
      const msg = `Voici quelques attractions à visiter à Drâa-Tafilalet : ${noms}.`;
      return res.json({ fulfillmentText: msg });
    });

  } else {
    // Réponses par défaut
    const userMessage = req.body.queryResult.queryText.toLowerCase();
    let responseText = '';

    if (userMessage.includes('bonjour')) {
      responseText = 'Bonjour et bienvenue dans notre application !';
    } else if (userMessage.includes('bonsoir')) {
      responseText = 'Bonsoir et bienvenue, passez une bonne soirée !';
    } else {
      responseText = 'Je n’ai pas compris, pouvez-vous reformuler ?';
    }

    return res.json({ fulfillmentText: responseText });
  }
});

// 🚀 Serveur en ligne
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook en ligne sur le port ${PORT}`);
});
