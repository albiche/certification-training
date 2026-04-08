# Quiz Révision — Site Web Statique

Site de révision interactif avec système de groupes progressifs (Leitner simplifié).
Fonctionne entièrement côté navigateur, déployable sur GitHub Pages.

---

## Fonctionnement

- **4 groupes** : les questions démarrent en groupe 1
- **Bonne réponse** : la question monte d'un groupe (1→2→3→4)
- **Mauvaise réponse** : la question reste dans son groupe
- **Régression automatique** : toutes les N jours (5 par défaut), chaque question redescend d'un groupe
- **Victoire** : quand toutes les questions sont en groupe 4

### Probabilités de sélection
| Groupe | Probabilité |
|--------|-------------|
| 1      | 90 %        |
| 2      | 9 %         |
| 3      | 1 %         |
| 4      | 0 % (mastered, non posées) |

---

## Structure du projet

```
quiz-web/
├── public/
│   └── questions.csv        ← Votre fichier de questions
├── src/
│   ├── components/          ← Composants React
│   ├── logic/               ← Logique métier (progression, sélection)
│   ├── storage/             ← Persistence localStorage
│   ├── types/               ← Types TypeScript
│   ├── utils/               ← Parser CSV
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Lancer en local

### Prérequis
- Node.js 18+ installé

### Installation
```bash
cd quiz-web
npm install
```

### Ajouter vos questions
Copiez votre fichier CSV dans `public/questions.csv`.

Le CSV doit avoir les colonnes :
`question_id, topic, question_text, choice_A, choice_B, choice_C, choice_D, choice_E, choice_F, answer, question_type, nb_choices, explanation, url`

### Démarrer
```bash
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

---

## Build

```bash
npm run build
```

Les fichiers statiques sont générés dans `dist/`.

### Prévisualiser le build
```bash
npm run preview
```

---

## Déploiement GitHub Pages

### 1. Configurer la base URL

Dans `vite.config.ts`, modifiez `base` avec le nom de votre dépôt :

```ts
export default defineConfig({
  plugins: [react()],
  base: '/nom-de-votre-repo/',  // ex: '/quiz-web/'
})
```

Ou via variable d'environnement :
```bash
VITE_BASE_PATH=/quiz-web/ npm run build
```

### 2. Déployer automatiquement

```bash
npm run deploy
```

Cette commande build le projet et pousse `dist/` sur la branche `gh-pages`.

### 3. Activer GitHub Pages

Dans les Settings de votre dépôt GitHub :
- **Pages** → Source : `gh-pages` branch → `/ (root)`

Votre site sera disponible à :
`https://votre-username.github.io/nom-de-votre-repo/`

---

## Stockage

Toutes les données sont sauvegardées dans `localStorage` du navigateur :
- Groupe de chaque question
- Date de la dernière régression
- Intervalle de régression configuré
- Compteur de réponses

Clé de stockage : `quiz_web_progress_v1`

---

## Paramètres

Le bouton ⚙️ ouvre le panneau de paramètres :
- Statistiques par groupe
- Countdown avant la prochaine régression
- Modifier l'intervalle de régression (1-30 jours)
- Réinitialiser tous les groupes (retour au groupe 1)
