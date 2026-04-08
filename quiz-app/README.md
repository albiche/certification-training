# Quiz Révision

Application mobile de révision personnelle avec système de groupes progressifs et régression automatique.

## Prérequis

- [Node.js 18+](https://nodejs.org/)
- [Expo Go](https://expo.dev/go) sur votre téléphone (iOS ou Android)

## Installation

```bash
cd quiz-app
npm install
```

## Lancer l'app

```bash
npm start
```

Un QR code s'affiche dans le terminal. Scannez-le avec :
- **Android** : l'app Expo Go directement
- **iOS** : l'app Appareil photo native, puis ouvrir dans Expo Go

L'app se charge en quelques secondes sur votre téléphone.

---

## Mettre à jour vos questions

Le fichier CSV est dans `assets/questions_exam12_ready.csv`.

| Colonne | Description |
|---|---|
| `question_id` | Identifiant unique (ex: `1`, `42`) |
| `topic` | Thème affiché au-dessus de la question |
| `question_text` | Texte de la question |
| `choice_A` … `choice_F` | Choix (les colonnes vides sont ignorées automatiquement) |
| `answer` | Réponse correcte : `C` pour une seule, `B\|D\|E` pour plusieurs |
| `question_type` | `single` ou `multiple` |
| `explanation` | Explication affichée après la réponse |

> Après avoir modifié le CSV, relancez `npm start`.  
> Si vous avez une progression existante, elle est conservée pour les questions déjà connues. Les nouvelles questions démarrent en groupe 1.

---

## Système de groupes

```
Groupe 1 (rouge)  → 50% de chances d'être sélectionné
Groupe 2 (orange) → 30%
Groupe 3 (bleu)   → 20%
Groupe 4 (vert)   → 0%  (question maîtrisée, plus posée)
```

**Progression** (bonne réponse) : G1 → G2 → G3 → G4  
**Mauvaise réponse** : la question reste dans son groupe  
**Régression automatique** : toutes les 5 jours, chaque question descend d'un groupe (même si l'app est fermée)  
**Victoire** : quand toutes les questions sont en groupe 4

---

## Structure du projet

```
quiz-app/
├── assets/
│   └── questions_exam12_ready.csv   ← votre CSV ici
├── src/
│   ├── components/    ← GroupStats, QuestionCard, AnswerFeedback, VictoryScreen
│   ├── logic/         ← progression.ts, questionSelector.ts
│   ├── storage/       ← AsyncStorage (persistance locale)
│   ├── utils/         ← csvParser.ts (chargement + parsing)
│   └── types/         ← types TypeScript
├── App.tsx            ← point d'entrée et gestion d'état globale
├── metro.config.js    ← configure Metro pour lire les fichiers .csv
└── package.json
```

---

## Réinitialiser la progression

L'écran de victoire propose un bouton "Tout recommencer" qui efface la progression et repart de zéro.
