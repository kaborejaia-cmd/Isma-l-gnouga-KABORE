# Guide de Déploiement FOBCHAT sur le Play Store

Félicitations pour votre application **FOBCHAT** ! Pour la mettre sur le Google Play Store, voici les étapes à suivre :

## 1. Exporter le Code
Dans l'interface de Google AI Studio :
- Cliquez sur l'icône **Settings** (Paramètres).
- Choisissez **Export to ZIP** pour télécharger le projet sur votre ordinateur.

## 2. Transformer en Application Mobile (Android)
Comme FOBCHAT est une application web moderne (React/Vite), vous devez la "mousser" dans une enveloppe Android. Les deux meilleures options sont :

### Option A : Capacitor (Recommandé pour les développeurs)
1. Installez Node.js sur votre ordinateur.
2. Dans le dossier de votre projet, exécutez les commandes :
   ```bash
   npm install
   npm run build
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init
   npx cap add android
   npx cap copy
   npx cap open android
   ```
3. Cela ouvrira **Android Studio** où vous pourrez générer votre fichier `.apk` ou `.aab`.

### Option B : Outils "No-Code" (Plus simple)
Utilisez des services comme [Gonative.io](https://gonative.io) ou [PWA2APK](https://pwa2apk.com). Vous leur donnez l'URL de votre application déployée, et ils créent le fichier pour vous.

## 3. Publication sur Google Play
1. Créez un compte développeur sur [Google Play Console](https://play.google.com/console) (frais uniques d'environ 25$).
2. Importez votre fichier `.aab` généré à l'étape précédente.
3. Remplissez les informations (images, description, langues).
4. Soumettez pour examen (cela prend généralement 2 à 7 jours).

---
*Note: N'oubliez pas d'ajouter votre `GEMINI_API_KEY` dans les variables d'environnement de votre serveur final pour que la traduction vocale fonctionne.*
