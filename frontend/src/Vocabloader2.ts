import IVocab from "./interfaces/IVocab"; // Importiere das Interface
  
  export class VocabLoader {
    vocabList: IVocab[] = [];
  
    constructor() {}
  
    // Funktion, um die JSON-Datei zu laden
    async loadVocab() {
        try {
          const response = await fetch('data/vocab.json');
          if (!response.ok) {
            throw new Error('Fehler beim Laden der Vokabeln');
          }
          const vocabData: IVocab[] = await response.json();
          // Füge Standardwerte für level und lastUsage hinzu, falls sie nicht vorhanden sind
          this.vocabList = vocabData.map(vocab => ({
            ...vocab,
            level: vocab.level || 1, // Standardlevel auf 1 setzen
            lastUsage: vocab.lastUsage ? new Date(vocab.lastUsage) : new Date() // Falls nicht vorhanden, auf aktuelles Datum setzen
          }));
          console.log("Vokabeln erfolgreich geladen:", this.vocabList);
        } catch (error) {
          console.error('Fehler beim Laden der Vokabeln:', error);
        }
      }
      
  
    // Funktion, um alle Vokabeln zu erhalten
    getAllVocab() {
      return this.vocabList;
    }
  
    // Funktion, um Vokabeln in die Datenbank einzufügen
    async insertVocabIntoDB(db: any) {
      if (this.vocabList.length === 0) {
        console.log("Keine Vokabeln zum Einfügen vorhanden.");
        return;
      }
  
      try {
        // Iteriere über die Vokabeln und füge sie in die Datenbank ein
        db.run("BEGIN TRANSACTION;");
        for (const vocab of this.vocabList) {
          db.run("INSERT INTO vocab (word, translation) VALUES (?, ?)", [vocab.word, vocab.translation]);
        }
        db.run("COMMIT;");
        console.log("Vokabeln erfolgreich in die Datenbank eingefügt.");
      } catch (error) {
        db.run("ROLLBACK;");
        console.error("Fehler beim Einfügen der Vokabeln in die Datenbank:", error);
      }
    }
  }
  