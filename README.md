# Certification Training

Système complet de révision pour des examens de certification.

Il se compose de trois parties indépendantes qui s'enchaînent :

1. **Scripts Python** — scraper les questions depuis ExamPrepper et générer des explications via IA
2. **quiz-app** — application mobile (React Native / Expo)
3. **quiz-web** — site web statique déployable sur GitHub Pages

---

## Structure du projet

```
certification-training/
├── config.yaml              ← configuration locale (gitignorée — contient la clé API)
├── config.example.yaml      ← modèle de configuration à copier
│
├── data/
│   ├── raw/                 ← questions brutes issues du scraping
│   ├── processed/           ← questions enrichies, prêtes pour les apps
│   └── samples/             ← fichiers d'exemple et de test
│
├── scripts/
│   ├── scrapping_questions.py   ← scraper ExamPrepper
│   └── preprocess.py            ← transformer + générer les explications IA
│
├── quiz-app/                ← application mobile Expo / React Native
└── quiz-web/                ← site web statique (React + Vite)
```

---

## Prérequis

| Outil | Version minimale | Usage |
|-------|-----------------|-------|
| Python | 3.11+ | scripts de données |
| Node.js | 18+ | quiz-app et quiz-web |
| Chrome | récent | scraping (Selenium) |
| Expo Go | dernière | tester l'app mobile |

---

## Mise en place

### 1. Cloner le repo

```bash
git clone https://github.com/albiche/certification-training.git
cd certification-training
```

### 2. Créer la configuration locale

```bash
cp config.example.yaml config.yaml
```

Ouvrir `config.yaml` et renseigner :
- `scraping.exam_id` — ID de l'examen sur ExamPrepper (ex : `12`)
- `api.api_key` — votre clé OpenAI (`sk-proj-...`)

### 3. Installer les dépendances Python

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate

pip install pandas pyyaml tqdm openai beautifulsoup4 undetected-chromedriver selenium selenium-stealth openpyxl
```

---

## Pipeline de données

### Étape 1 — Scraper les questions

```bash
python scripts/scrapping_questions.py
```

- Ouvre Chrome en mode non-headless (visible) avec un profil persistant
- Parcourt toutes les pages de l'examen `exam_id` sur ExamPrepper
- Génère : `data/raw/questions_exam{id}_all.csv`

**Reprendre un scraping interrompu** — dans `config.yaml` :
```yaml
scraping:
  start_page: 42   # repart à la page 42
```

### Étape 2 — Générer les explications

```bash
python scripts/preprocess.py
```

- Lit `data/raw/questions_exam{id}_all.csv`
- Éclate les choix en colonnes `choice_A` … `choice_F`
- Normalise les réponses (`C`, `B|D|E`, …)
- Appelle l'API OpenAI pour générer une explication par question
- Génère : `data/processed/questions_exam{id}_ready.csv`

> Les explications déjà générées sont conservées (`skip_existing_explanations: true`).
> Relancez le script autant de fois que nécessaire en cas d'interruption.

### Étape 3 — Copier les données dans les apps

Après chaque mise à jour des questions :

```bash
# App mobile
cp data/processed/questions_exam12_ready_fix.csv quiz-app/assets/questions_exam12_ready_fix.csv

# Site web
cp data/processed/questions_exam12_ready_fix.csv quiz-web/public/questions.csv
```

---

## quiz-app — Application mobile

Application React Native / Expo SDK 54.

### Lancer en développement

```bash
cd quiz-app
npm install
npx expo start
```

Scanner le QR code avec **Expo Go** (iOS / Android).

### Mettre à jour les questions

```bash
cp data/processed/questions_exam12_ready_fix.csv quiz-app/assets/questions_exam12_ready_fix.csv
```

Relancer `npx expo start`.

---

## quiz-web — Site web statique

Application React + Vite, déployable sur GitHub Pages.

### Lancer en développement

```bash
cd quiz-web
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

### Mettre à jour les questions

```bash
cp data/processed/questions_exam12_ready_fix.csv quiz-web/public/questions.csv
```

### Build et déploiement GitHub Pages

```bash
cd quiz-web
npm run build      # génère dist/
npm run deploy     # pousse dist/ sur la branche gh-pages
```

Le site est disponible à : `https://albiche.github.io/certification-training/`

---

## Système de révision (commun aux deux apps)

Les deux applications partagent exactement la même logique :

### Groupes

Chaque question est dans un groupe de 1 à 4 :

| Groupe | Signification | Probabilité d'être posée |
|--------|--------------|--------------------------|
| 1 | À apprendre | 90 % |
| 2 | En cours | 9 % |
| 3 | Presque maîtrisé | 1 % |
| 4 | Maîtrisé | 0 % (plus posée) |

- **Bonne réponse** → monte d'un groupe
- **Mauvaise réponse** → reste dans le même groupe
- **Victoire** → toutes les questions en groupe 4

### Régression automatique

Toutes les N jours (5 par défaut), chaque question redescend d'un groupe.
Configurable dans les paramètres ⚙️ de l'app.

---

## Changer d'examen

1. Modifier `config.yaml` :
```yaml
scraping:
  exam_id: 99   # nouvel ID ExamPrepper
preprocessing:
  input_csv:  data/raw/questions_exam99_all.csv
  output_csv: data/processed/questions_exam99_ready.csv
```

2. Lancer le pipeline :
```bash
python scripts/scrapping_questions.py
python scripts/preprocess.py
```

3. Copier dans les apps et redéployer.

---

## Workflow quotidien

```bash
# Nouvelles questions disponibles ?
python scripts/scrapping_questions.py
python scripts/preprocess.py

# Mettre à jour les apps
cp data/processed/questions_exam12_ready_fix.csv quiz-web/public/questions.csv

# Pousser et déployer
git add .
git commit -m "update: refresh question dataset"
git push
cd quiz-web && npm run deploy
```
