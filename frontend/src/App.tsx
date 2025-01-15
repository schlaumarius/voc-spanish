import { useEffect, useState } from "react";
import IVocab from "./interfaces/IVocab";
import { VocabLoader } from "./VocabLoader"; // Importiere den VocabLoader
import "./App.css"; // Importiere das CSS

const App = () => {
  const [data, setData] = useState<IVocab[]>([]);
  const [showWord, setShowWord] = useState(false); // Toggle between word and translation
  const [randomVocab, setRandomVocab] = useState<IVocab | undefined>(undefined);
  const [solutionShown, setSolutionShown] = useState(false); // Solution shown?
  const [levelRules, setLevelRules] = useState<any[]>([]); // Level rules for vocab
  const [shouldSetNewVocab, setShouldSetNewVocab] = useState(false); // Steuert, ob eine neue Vokabel gesetzt wird

  // Create an instance of VocabLoader
  const vocabLoader = new VocabLoader();

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

  // Fetch vocab data from the server
  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/vocab");
      const result = await response.json();
      setData(result); // Set the vocab data
      console.log("data", data);
    } catch (error) {
      console.error("Error fetching vocab data:", error);
    }
  };

  // Check if there are no vocab in the DB, then load them from JSON
  const loadVocabIfEmpty = async () => {
    if (data.length === 0) {
      try {
        await fetch("http://localhost:3000/api/vocab/load", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(vocabLoader.getAllVocab()), // Gib die Vokabeln aus dem Loader weiter
        });
        await fetchData(); // Hole die Daten aus der DB nach dem Einfügen
      } catch (error) {
        console.error("Fehler beim Laden der Vokabeln in die DB:", error);
      }
    }
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

  // Display word or translation
  const showTranslation = () => {
    setShowWord(true);
    setSolutionShown(true);
  };

  // Mark vocab as correct and increase its level
  const markCorrect = async () => {
    if (!randomVocab) return;

    try {
      const updatedVocab = {
        ...randomVocab,
        level: randomVocab.level + 1,
        lastUsage: new Date().toISOString(),
      };

      // Send update to the server
      await fetch(`http://localhost:3000/api/vocab/${randomVocab.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedVocab),
      });

      await fetchData(); // Re-fetch data after updating
      setShouldSetNewVocab(true); // Erlaubt das Setzen einer neuen Vokabel im useEffect
      setSolutionShown(false);
      setShowWord(false);
    } catch (error) {
      console.error("Error marking vocab as correct:", error);
    }
  };

  // Mark vocab as incorrect and reset its level
  const markIncorrect = async () => {
    if (!randomVocab) return;

    try {
      const updatedVocab = {
        ...randomVocab,
        level: 1,
        lastUsage: new Date().toISOString(),
      };

      // Send update to the server
      await fetch(`http://localhost:3000/api/vocab/${randomVocab.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedVocab),
      });

      await fetchData(); // Re-fetch data after updating
      setShouldSetNewVocab(true); // Erlaubt das Setzen einer neuen Vokabel im useEffect
      setSolutionShown(false);
      setShowWord(false);
    } catch (error) {
      console.error("Error marking vocab as incorrect:", error);
    }
  };

  // Combine all the necessary setup functions into a single useEffect
  useEffect(() => {
    const initialize = async () => {
      try {
        await loadLevelRules(); // Warte auf das Laden der Level-Regeln
        await loadVocabIfEmpty(); // Warte, bis Vokabeln geladen sind (falls leer)
        await fetchData(); // Warte auf das Abrufen der Daten aus der DB
      } catch (error) {
        console.error("Fehler beim Initialisieren der App:", error);
      }
    };

    initialize(); // Asynchrone Initialisierungsfunktion aufrufen
  }, []); // Keine Abhängigkeit, wird nur einmal beim ersten Laden der Komponente ausgeführt

  // Setze zufällige Vokabel, wenn sich die Daten ändern und shouldSetNewVocab true ist
  useEffect(() => {
    if (data.length > 0 && (randomVocab === undefined || shouldSetNewVocab)) {
      setRandomVocab(showRandomVocab());
      setShouldSetNewVocab(false); // Setzt zurück, um keine Endlosschleife zu erzeugen
    }
  }, [data, shouldSetNewVocab]); // Dieser Effekt wird nur ausgelöst, wenn `data` oder `shouldSetNewVocab` sich ändert

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
              {randomVocab.id}
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
