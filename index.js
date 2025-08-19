const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const translate = require("@vitalets/google-translate-api");

const app = express();
app.use(bodyParser.json());

// URL du backend Spring Boot déployé sur Render
const SPRING_BOOT_API = "https://touristeproject.onrender.com/api/public";

// ✅ Webhook pour Dialogflow
app.post("/webhook", async (req, res) => {
  const intent = req.body.queryResult?.intent?.displayName;
  const userMessage = req.body.queryResult?.queryText?.toLowerCase() || "";
  const lang = req.body.queryResult?.languageCode || "en";

  try {
    // ---- Cas 1 : Intent "Visite"
    if (intent?.toLowerCase().includes("visite")) {
      return res.json({
        fulfillmentText:
          lang === "fr"
            ? "Souhaitez-vous découvrir des sites historiques, naturels, culturels ou bien tous ?"
            : "Would you like to discover historical, natural, cultural sites, or all of them?",
        outputContexts: [
          {
            name: ${req.body.session}/contexts/attente_type_attraction,
            lifespanCount: 2,
          },
        ],
      });
    }

    // ---- Cas 2 : Choix type attraction
    if (intent === "ChoixTypeAttraction") {
      let endpoint = "";

      if (userMessage.includes("historique") || userMessage.includes("historical")) {
        endpoint = "/attractions/historical";
      } else if (userMessage.includes("naturel") || userMessage.includes("natural")) {
        endpoint = "/attractions/natural";
      } else if (userMessage.includes("culturel") || userMessage.includes("cultural")) {
        endpoint = "/attractions/cultural";
      } else if (userMessage.includes("artificiel") || userMessage.includes("artificial")) {
        endpoint = "/attractions/artificial";
      } else if (userMessage.includes("tous") || userMessage.includes("all")) {
        endpoint = "/attractions";
      }

      if (!endpoint) {
        return res.json({
          fulfillmentText:
            lang === "fr"
              ? "Merci de préciser un type valide : historique, naturel, culturel ou tous."
              : "Please specify a valid type: historical, natural, cultural or all.",
        });
      }

      // 🔗 Appel au backend Spring Boot
      const response = await axios.get(${SPRING_BOOT_API}${endpoint});
      const attractions = response.data;

      if (!attractions || attractions.length === 0) {
        return res.json({
          fulfillmentText: lang === "fr" ? "Aucune attraction trouvée." : "No attractions found.",
        });
      }

      const messages = [];
      for (const item of attractions.slice(0, 3)) {
        let desc = item.description || "";
        if (lang === "fr" && desc) {
          try {
            const result = await translate(desc, { to: "fr" });
            desc = result.text;
          } catch {
            desc = "[Traduction indisponible]";
          }
        }
        messages.push(• ${item.name} : ${desc});
      }

      return res.json({
        fulfillmentText:
          lang === "fr"
            ? Voici quelques attractions :\n\n${messages.join("\n\n")}
            : Here are some attractions:\n\n${messages.join("\n\n")},
      });
    }

    // ---- Cas 3 : salutations
    if (userMessage.includes("bonjour")) {
      return res.json({
        fulfillmentText: lang === "fr" ? "Bonjour et bienvenue !" : "Hello and welcome!",
      });
    }

    if (userMessage.includes("bonsoir")) {
      return res.json({
        fulfillmentText: lang === "fr" ? "Bonsoir et bienvenue !" : "Good evening and welcome!",
      });
    }

    // ---- Par défaut
    return res.json({
      fulfillmentText:
        lang === "fr"
          ? "Je n’ai pas compris, pouvez-vous reformuler ?"
          : "I didn’t understand, could you please rephrase?",
    });
  } catch (err) {
    console.error("❌ Erreur Webhook :", err.message);
    return res.json({
      fulfillmentText:
        lang === "fr"
          ? "Une erreur est survenue. Veuillez réessayer plus tard."
          : "An error occurred. Please try again later.",
    });
  }
});

// ---- Lancement serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(🚀 Webhook chatbot en ligne sur le port ${PORT});
});