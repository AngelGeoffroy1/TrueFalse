# TrueFalse - Application de Quiz avec Système Anti-Triche

TrueFalse est une application web de création et de gestion de quiz interactifs destinée aux enseignants pour évaluer leurs élèves. Inspirée par des plateformes comme Socrative ou Kahoot, TrueFalse se distingue par son système anti-triche qui détecte lorsqu'un élève quitte l'onglet du quiz ou tente d'accéder à d'autres ressources.

## Fonctionnalités principales

### Pour les enseignants
- Création de quiz avec différents types de questions
- Paramétrage du temps par question
- Options de personnalisation (ordre aléatoire, affichage des réponses, etc.)
- Système anti-triche activable/désactivable
- Tableau de bord avec suivi en temps réel des réponses des élèves
- Analyse des résultats après le quiz
- Génération de codes de session pour partager facilement les quiz

### Pour les élèves
- Interface simple pour rejoindre un quiz avec un code
- Visualisation claire des questions et du temps restant
- Feedback immédiat sur les réponses (si activé par l'enseignant)
- Mode plein écran pour limiter les distractions

### Système anti-triche
- Détection de changement d'onglet ou de fenêtre
- Détection de copier-coller
- Blocage du clic droit
- Option de mode plein écran obligatoire
- Enregistrement des tentatives de triche
- Possibilité de configurer les actions en cas de détection (avertissement, pénalité, passage automatique à la question suivante)

## Technologies utilisées

- **Frontend**: Next.js, TypeScript, React
- **Styling**: Tailwind CSS
- **Composants UI**: shadcn/ui
- **État global**: Zustand
- **Animations**: Framer Motion
- **Stockage**: LocalStorage (actuellement), avec possibilité d'extension vers une base de données

## Installation et utilisation

### Prérequis
- Node.js 18.17 ou plus récent
- npm ou yarn

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-username/truefalse.git
cd truefalse

# Installer les dépendances
npm install
# ou
yarn install

# Lancer le serveur de développement
npm run dev
# ou
yarn dev
```

L'application sera disponible à l'adresse [http://localhost:3000](http://localhost:3000).

## Architecture du projet

```
/app
  /api (routes API)
  /(routes)
    /dashboard - Interface enseignant
    /quiz - Interface élève
    /results - Affichage des résultats
/components
  /ui - Composants shadcn
  /quiz - Composants spécifiques au quiz
  /dashboard - Composants du tableau de bord
  /auth - Composants d'authentification
/lib
  /hooks - Hooks personnalisés
  /utils - Utilitaires
  /store - État global avec Zustand
```

## Mode d'emploi

### Pour les enseignants

1. Accédez à l'espace enseignant
2. Créez un nouveau quiz ou sélectionnez un quiz existant
3. Configurez les paramètres (temps, options anti-triche, etc.)
4. Lancez une session pour obtenir un code
5. Partagez le code avec vos élèves
6. Surveillez la progression en temps réel
7. Consultez les résultats à la fin

### Pour les élèves

1. Accédez à l'espace élève
2. Entrez le code fourni par l'enseignant et votre nom
3. Répondez aux questions dans le temps imparti
4. Consultez vos résultats à la fin (si activé)

## Limitations actuelles et développements futurs

- Actuellement, les données sont stockées localement sans persistance entre sessions
- L'authentification n'est pas encore implémentée
- Fonctionnalités futures prévues:
  - Base de données pour le stockage persistant
  - Système d'authentification
  - Plus de types de questions (réponse courte, glisser-déposer, etc.)
  - Mode hors ligne
  - Exportation des résultats au format CSV/Excel
  - Intégration avec des LMS (Moodle, Google Classroom, etc.)

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Contact

Pour toute question ou suggestion concernant ce projet, veuillez ouvrir une issue sur GitHub.
