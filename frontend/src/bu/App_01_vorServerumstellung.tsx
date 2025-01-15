import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import IVocab from "./interfaces/IVocab";
import { VocabLoader } from "./VocabLoader";
import "./App.css"; // Importiere das CSS

const App = () => {
  const [db, setDb] = useState<Database | null>(null);
  const [data, setData] = useState<IVocab[]>([]);
  const [showWord, setShowWord] = useState(false); // Toggle between word and translation
  const [randomVocab, setRandomVocab] = useState<IVocab | undefined>(undefined);
  const [solutionShown, setSolutionShown] = useState(false); // Solution shown?
  const [levelRules, setLevelRules] = useState<any[]>([]); // Level rules for vocab

  // Load level rules from JSON file
  const loadLevelRules = async () => {
    try {
      const response = await fetch("/data/ruleSet.json");
      const rules = await response.json();
      setLevelRules(rules);
    } catch (error) {
      console.error("Error loading level rules:", error);
    }
  };

  // Initialize the database and load data
  const initializeDatabase = async () => {
    try {
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });

      const dbInstance = new SQL.Database();
      setDb(dbInstance);

      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS vocab (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT,
          translation TEXT,
          level INTEGER,
          lastUsage TEXT
        )
      `);

      const dataExists = await checkIfDataExists(dbInstance);
      if (dataExists) {
        fetchData(dbInstance);
      } else {
        const vocabLoader = new VocabLoader();
        await vocabLoader.loadVocab();
        await vocabLoader.insertVocabIntoDB(dbInstance);
        fetchData(dbInstance);
      }

      loadLevelRules();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  };

  // Check if data exists in the vocab table
  const checkIfDataExists = async (db: Database): Promise<boolean> => {
    const result = db.exec("SELECT COUNT(id) AS count FROM vocab");

    if (result.length > 0 && result[0].values.length > 0) {
      const count = result[0].values[0][0];
      return count != null && count > 0; // Überprüfe, ob count nicht null oder undefined ist
    }

    return false;
  };

  // Determine if a vocab item is eligible for display
  const canShowVocab = (vocab: IVocab): boolean => {
    if (!vocab.level || !vocab.lastUsage) return true; // Show if level or lastUsage is missing

    const rule = levelRules.find((r) => r.Level === vocab.level);
    if (!rule) return false;

    const hoursSinceLastUsage =
      (new Date().getTime() - new Date(vocab.lastUsage).getTime()) /
      (1000 * 3600);

    return hoursSinceLastUsage >= parseInt(rule.duration, 10);
  };

  // Select a random eligible vocab item to display
  const showRandomVocab = (): IVocab | undefined => {
    const eligibleVocab = data.filter(canShowVocab);
    return eligibleVocab.length > 0
      ? eligibleVocab[Math.floor(Math.random() * eligibleVocab.length)]
      : undefined;
  };

  // Fetch vocab data from the database
  const fetchData = (db: Database) => {
    if (!db) return;

    const res = db.exec("SELECT * FROM vocab");
    if (res.length > 0) {
      const rows = res[0].values.map((row) => ({
        id: row[0] as number,
        word: row[1] as string,
        translation: row[2] as string,
        level: row[3] as number,
        lastUsage: new Date(row[4] as string),
      }));
      setData(rows);
    }
  };

  // Display word or translation
  const showTranslation = () => {
    setShowWord(true);
    setSolutionShown(true);
  };

  // Mark vocab as correct and increase its level
  const markCorrect = async () => {
    if (!randomVocab || !db) return;

    db.run("UPDATE vocab SET level = level + 1, lastUsage = ? WHERE id = ?", [
      new Date().toISOString(),
      randomVocab.id,
    ]);

    setRandomVocab(showRandomVocab());
    setSolutionShown(false);
    setShowWord(false);
  };

  // Mark vocab as incorrect and reset its level
  const markIncorrect = async () => {
    if (!randomVocab || !db) return;

    db.run("UPDATE vocab SET level = 1, lastUsage = ? WHERE id = ?", [
      new Date().toISOString(),
      randomVocab.id,
    ]);

    setRandomVocab(showRandomVocab());
    setSolutionShown(false);
    setShowWord(false);
  };

  // Initialize the database when the component loads
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Set random vocab when data is updated
  useEffect(() => {
    if (data.length > 0) {
      setRandomVocab(showRandomVocab());
    }
  }, [data]);

  return (
    <div className="app-container">
      <h1 className="app-title">Vokabeltrainer Spanisch</h1>
      {randomVocab ? (
        <p className="vocab-display">
          {showWord ? (
            <>
              <img
                src="/img/spain-flag.png"
                alt="Spain Flag"
                className="flag"
              />
              {randomVocab.word}
            </>
          ) : (
            <>
              <img
                src="/img/germany-flag.png"
                alt="Germany Flag"
                className="flag"
              />
              {randomVocab.translation}
            </>
          )}
        </p>
      ) : (
        <p className="vocab-display">No data available</p>
      )}

      <button
        onClick={showTranslation}
        className="solution-button"
        style={{ display: solutionShown ? "none" : "block" }}
      >
        Lösung anzeigen
      </button>

      {solutionShown && (
        <div className="action-buttons">
          <button className="correct-button" onClick={markCorrect}>
            Korrekt
          </button>
          <button className="incorrect-button" onClick={markIncorrect}>
            Falsch
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
