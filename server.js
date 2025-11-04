// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Загружаем сообщения из файла
let messages = [];
if (fs.existsSync("messages.json")) {
  try {
    messages = JSON.parse(fs.readFileSync("messages.json", "utf8"));
  } catch (e) {
    console.log("Ошибка чтения messages.json, создаю новый");
    messages = [];
  }
}

// Функция сохранения сообщений
function saveMessages() {
  fs.writeFileSync("messages.json", JSON.stringify(messages, null, 2));
}

wss.on("connection", (ws) => {
  console.log("✅ New client connected");

  // Отправляем историю новому пользователю
  ws.send(JSON.stringify({ type: "history", messages }));

  ws.on("message", (message) => {
    // Сообщение приходит как строка "sender::text"
    const text = message.toString();

    // Разбираем на { sender, text }
    const [sender, msg] = text.split("::");
    const newMessage = { sender, msg };

    // Добавляем в память и записываем в файл
    messages.push(newMessage);
    saveMessages();

    // Рассылаем всем подключенным клиентам
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "message", message: newMessage }));
      }
    });
  });

  ws.on("close", () => console.log("❌ Client disconnected"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
