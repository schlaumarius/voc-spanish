const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const fs = require("fs");
const app = express();
const port = 3000;

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));

app.use(express.json());

// Datenbankverbindung zu einer SQLite-Datei
const dbPath = path.resolve(__dirname, "vocab.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Fehler beim Verbinden zur Datenbank:", err.message);
  } else {
    console.log("Datenbank erfolgreich verbunden");
  }
});

app.put("/api/vocab/:id", (req, res) => {
  const { id } = req.params;
  const { word, translation, level, lastUsage } = req.body;

  const stmt = db.prepare(
    "UPDATE vocab SET word = ?, translation = ?, level = ?, lastUsage = ? WHERE id = ?"
  );
  stmt.run(word, translation, level, lastUsage, id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id, word, translation, level, lastUsage });
  });
});

// Erstelle die Tabelle, falls sie nicht existiert
db.run(`
  CREATE TABLE IF NOT EXISTS vocab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    level INTEGER,
    lastUsage TEXT
  );
`, (err) => {
  if (err) {
    console.error("Fehler beim Erstellen der Tabelle:", err.message);
  } else {
    console.log("Tabelle 'vocab' wurde erstellt oder existiert bereits.");
  }
});

// API-Endpunkt für das Abrufen der Vokabeln
app.get("/api/vocab", (req, res) => {
  console.log("GET /api/vocab - Abrufen der Vokabeln...");
  db.all("SELECT * FROM vocab", (err, rows) => {
    if (err) {
      console.error("Fehler beim Abrufen der Vokabeln:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// API-Endpunkt für das Laden von Vokabeln
app.post("/api/vocab/load", (req, res) => {
  console.log("POST /api/vocab/load - Lade Vokabeln...");
  const vocabFilePath = path.join(__dirname, "../frontend/public/data", "vocab.json");

  fs.readFile(vocabFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Fehler beim Laden der Vokabeln:", err);
      return res.status(500).json({ message: "Fehler beim Laden der Vokabeln." });
    }

    try {
      const vocabData = JSON.parse(data);

      console.log("Beginne Transaktion zum Einfügen von Vokabeln...");
      db.serialize(() => {
        db.run("BEGIN TRANSACTION;");
        vocabData.forEach((vocab) => {
          db.get(
            "SELECT * FROM vocab WHERE word = ? AND translation = ?",
            [vocab.word, vocab.translation],
            (err, row) => {
              if (err) {
                console.error("Fehler beim Überprüfen der Vokabeln:", err);
              }
              if (!row) {
                db.run("INSERT INTO vocab (word, translation) VALUES (?, ?)", [
                  vocab.word,
                  vocab.translation,
                ]);
              }
            }
          );
        });
        db.run("COMMIT;");
      });

      console.log("Transaktion abgeschlossen.");
      res.status(200).json({ message: "Vokabeln erfolgreich in die Datenbank eingefügt." });

    } catch (error) {
      console.error("Fehler beim Parsen der JSON-Daten:", error);
      res.status(500).json({ message: "Fehler beim Verarbeiten der Vokabeln." });
    }
  });
});


// Starte den Server
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
