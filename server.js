const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

const TELEGRAM_BOT_TOKEN = '8096107981:AAF4QDZy7Lp73VKkHh_aXscCg6GuaLvn6oM';
const OWNER_ID = '7865382097';
const pendingRequests = {};

app.use(bodyParser.json());
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post('/request-approval', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.json({ success: false });

  pendingRequests[phone] = { approved: false };

  const message = `🔐 New login request\n📱 Phone: ${phone}`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve:${phone}` },
        { text: "❌ Deny", callback_data: `deny:${phone}` }
      ]
    ]
  };

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: OWNER_ID,
    text: message,
    reply_markup: inlineKeyboard
  });

  res.json({ success: true });
});

app.get('/status', (req, res) => {
  const phone = req.query.phone;
  const entry = pendingRequests[phone];
  res.json({ approved: entry?.approved || false });
});

app.post(`/webhook`, (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const data = update.callback_query.data;
    const [action, phone] = data.split(":");

    if (action === "approve") {
      pendingRequests[phone] = { approved: true };

      axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: OWNER_ID,
        text: `✅ Login for ${phone} approved.`
      });
    } else if (action === "deny") {
      delete pendingRequests[phone];
    }

    const callbackId = update.callback_query.id;
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      callback_query_id: callbackId,
      text: "Response received ✅"
    });
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
