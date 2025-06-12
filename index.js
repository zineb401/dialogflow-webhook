const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  const userMessage = req.body.queryResult.queryText;

  let responseText = '';

  if (userMessage.toLowerCase().includes('bonjour')) {
    responseText = 'Bonjour et bienvenue dans notre application !';
  } else if (userMessage.toLowerCase().includes('bonsoir')) {
    responseText = 'Bonsoir et bienvenue, passez une bonne soirée !';
  } else {
    responseText = 'Je n’ai pas compris, pouvez-vous reformuler ?';
  }

  res.json({
    fulfillmentText: responseText
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Webhook en ligne sur le port ${PORT}');
});