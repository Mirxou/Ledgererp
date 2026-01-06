# 🔧 Guide de dépannage - Authentification Pi Network

## ⚠️ Problème: "⏳ Authenticating with Pi Network... puis failed"

Ce guide vous aide à diagnostiquer et résoudre les problèmes d'authentification Pi Network.

---

## ❌ GitHub n'est PAS requis (Important!)

**Si vous avez un domaine réel (comme `https://ledgererp.online`), GitHub n'a AUCUN impact sur l'authentification Pi Network.**

### Quand GitHub est utilisé?
- ✅ Seulement si vous utilisez **GitHub Pages**
- ✅ Et votre URL est comme: `https://username.github.io/app`

### Votre cas:
- ✅ Vous avez un **domaine réel** (`ledgererp.online`)
- ✅ Votre site est **déjà publié**
- ❌ **GitHub n'est PAS nécessaire**

### Ce que Pi Network vérifie vraiment:
1. ✅ Le domaine (Origin) - `https://ledgererp.online`
2. ✅ L'environnement (Pi Browser)
3. ✅ Les paramètres dans Pi Developer Portal

**GitHub n'est pas dans cette liste!**

---

---

## ✅ Vérification #1: App URL dans Pi Developer Portal (90% des cas)

**C'est la cause la plus fréquente!**

### Étapes de vérification:

1. **Connectez-vous à Pi Developer Portal**
   - Allez sur: https://developer.minepi.com
   - Connectez-vous avec votre compte Pi

2. **Ouvrez votre application**
   - Trouvez "Ledger ERP" dans la liste de vos apps
   - Cliquez pour ouvrir les paramètres

3. **Vérifiez le champ "App URL"**
   - Il DOIT être exactement: `https://ledgererp.online`
   - **Sans www** (pas `https://www.ledgererp.online`)
   - **Sans chemin** (pas `https://ledgererp.online/app` ou `/login`)
   - **Avec https** (pas `http://ledgererp.online`)
   - **Sans slash final** (pas `https://ledgererp.online/`)

### ❌ Exemples INCORRECTS:
```
❌ https://www.ledgererp.online
❌ http://ledgererp.online
❌ https://ledgererp.online/app
❌ https://ledgererp.online/login
❌ https://ledgererp.online/
```

### ✅ Exemple CORRECT:
```
✅ https://ledgererp.online
```

4. **Sauvegardez et attendez**
   - Cliquez sur "Save" ou "Update"
   - Attendez 1-2 minutes pour que les changements prennent effet
   - Réessayez l'authentification

---

## ✅ Vérification #2: Utilisation de Pi Browser

**L'authentification Pi NE FONCTIONNE PAS dans les autres navigateurs!**

### Navigateurs qui NE FONCTIONNENT PAS:
- ❌ Chrome
- ❌ Firefox
- ❌ Edge
- ❌ Safari
- ❌ Opera

### Navigateur REQUIS:
- ✅ **Pi Browser uniquement**

### Comment vérifier:
1. Ouvrez Pi Browser sur votre appareil
2. Naviguez vers: `https://ledgererp.online`
3. Essayez l'authentification

### Vérification dans la console:
Ouvrez la console du navigateur et tapez:
```javascript
console.log(navigator.userAgent);
```

Si vous voyez `PiBrowser` dans le résultat → ✅ Correct
Si vous ne voyez PAS `PiBrowser` → ❌ Vous n'êtes pas dans Pi Browser

---

## ✅ Vérification #3: Ordre d'initialisation du SDK

**Pi.init() DOIT être appelé AVANT Pi.authenticate()**

### Ordre correct (automatique dans le code):
```javascript
// 1. Charger le SDK
<script src="https://sdk.minepi.com/pi-sdk.js"></script>

// 2. Initialiser
Pi.init({ version: "2.0" });

// 3. Authentifier
Pi.authenticate(['username'], callback)  // Utilisez seulement 'username' pour login
  .then(auth => {
    console.log('AUTH OK', auth);
  })
  .catch(err => {
    console.error('AUTH FAILED', err);
  });
```

Le code actuel gère cela automatiquement, mais si vous voyez une erreur "Pi.init() not called", vérifiez la console.

---

## ✅ Vérification #4: Scopes activés dans Dashboard ⚠️ CRITIQUE

**C'est souvent la cause #2 des échecs d'authentification (après l'App URL)**

### Qu'est-ce qu'un Scope?

Les **Scopes** sont les permissions que votre application demande à l'utilisateur Pi lors de l'authentification.

**Si un scope n'est pas activé dans Pi Developer Portal → L'authentification échoue immédiatement!**

### Scope minimum requis (OBLIGATOIRE):

Pour n'importe quel login normal, vous DEVEZ utiliser:

```javascript
const scopes = ['username'];
```

**Sans ce scope, l'authentification ne fonctionnera JAMAIS.**

### Scopes courants et leur signification:

| Scope | Fonction | Requis? |
|-------|----------|---------|
| `username` | Nom d'utilisateur Pi | ✅ **OBLIGATOIRE** |
| `payments` | Traitement des paiements | ❌ Optionnel (seulement si vous utilisez Pi Pay) |
| `wallet_address` | Adresse du portefeuille | ❌ Rarement nécessaire |

**⚠️ Ne demandez PAS un scope que vous n'utilisez pas!**

### Configuration actuelle de LedgerERP:

**Scopes utilisés actuellement:** `['username']` uniquement

**Pourquoi seulement `username`?**
- Vous avez besoin uniquement du login pour l'instant
- Les paiements peuvent être ajoutés plus tard si nécessaire
- Moins de scopes = moins de problèmes de configuration

### Comment vérifier et activer les Scopes:

1. **Allez dans Pi Developer Portal**
   - https://developer.minepi.com
   - Connectez-vous avec votre compte Pi

2. **Ouvrez votre application**
   - Trouvez "Ledger ERP" dans la liste
   - Cliquez pour ouvrir

3. **Allez dans "Permissions" ou "Scopes"**
   - Cherchez la section "Permissions" ou "Scopes"
   - Elle peut être dans "App Settings" ou dans un onglet séparé

4. **Vérifiez que "username" est activé**
   - ✅ **Username** doit être **ENABLED** (activé)
   - Si ce n'est pas le cas, activez-le

5. **Si vous voulez ajouter "payments" plus tard:**
   - Activez "Payments" dans le Dashboard
   - Modifiez le code pour utiliser: `['username', 'payments']`
   - Sauvegardez et attendez 1-2 minutes

6. **Sauvegardez**
   - Cliquez sur "Save" ou "Update"
   - Attendez 1-2 minutes pour que les changements prennent effet

### Code correct actuel:

```javascript
// Dans pi-adapter.js ligne ~232
const scopes = ['username'];  // ✅ Correct pour login uniquement

Pi.authenticate(scopes, callback)
  .then(auth => {
    console.log('AUTH SUCCESS', auth);
  })
  .catch(err => {
    console.error('AUTH FAILED', err);
  });
```

### Si vous voulez ajouter payments plus tard:

1. **Activez d'abord dans Dashboard:**
   - Pi Developer Portal → App → Permissions → Enable "Payments"

2. **Modifiez le code:**
   ```javascript
   const scopes = ['username', 'payments'];  // Ajoutez 'payments'
   ```

3. **Sauvegardez et attendez 1-2 minutes**

4. **Testez à nouveau**

### ⚠️ Erreurs courantes avec Scopes:

**Erreur:** "Authentication failed" sans message clair
**Cause:** Scope `username` non activé dans Dashboard
**Solution:** Activez `username` dans Pi Developer Portal → Permissions

**Erreur:** "Scope not authorized"
**Cause:** Vous demandez un scope non activé
**Solution:** Activez le scope dans Dashboard OU retirez-le du code

**Erreur:** "Invalid scope"
**Cause:** Faute de frappe dans le nom du scope
**Solution:** Vérifiez l'orthographe: `'username'` (pas `'user'` ou `'Username'`)

---

## ✅ Vérification #5: Mode Sandbox (pour développement local)

**Si vous testez sur localhost ou un domaine non publié:**

1. Activez "Sandbox Authorization" dans Pi Developer Portal
2. Ouvrez l'application depuis "Pi Utilities" dans Pi Browser
3. Utilisez le mode sandbox pour tester

**Pour la production (https://ledgererp.online):**
- Le mode sandbox n'est PAS nécessaire
- Utilisez directement Pi Browser

---

## 🔍 Diagnostic automatique

Le code inclut maintenant un diagnostic automatique qui vérifie:

1. ✅ Si vous êtes dans Pi Browser
2. ✅ Si l'URL correspond exactement
3. ✅ Si le SDK est chargé
4. ✅ Si Pi.init() a été appelé
5. ✅ Si Pi.authenticate() est disponible

### Comment voir le diagnostic:

1. Ouvrez la console du navigateur (F12)
2. Cliquez sur "Login with Pi Network"
3. Regardez les messages dans la console

Vous verrez des messages comme:
```
🔍 [DIAGNOSTIC] Pre-authentication check:
Pi object: {...}
Is Pi Browser: true/false
Current origin: https://ledgererp.online
Expected origin: https://ledgererp.online
Origin matches: true/false
...
```

---

## 📋 Checklist rapide

Avant de signaler un problème, vérifiez:

- [ ] App URL dans Pi Developer Portal = `https://ledgererp.online` (exactement)
- [ ] Scope `username` est activé dans Dashboard → Permissions/Scopes
- [ ] Vous utilisez Pi Browser (pas Chrome/Firefox/etc.)
- [ ] Vous avez attendu 1-2 minutes après avoir modifié l'App URL ou les Scopes
- [ ] Vous avez vérifié la console pour les messages d'erreur détaillés
- [ ] Votre connexion internet fonctionne
- [ ] **GitHub n'est PAS requis** (seulement pour GitHub Pages, pas pour les domaines réels)

## 🧪 Test rapide dans Console

Ouvrez la console (F12) dans Pi Browser et tapez:

```javascript
console.log(window.Pi);
console.log(Pi.isInitialized ? Pi.isInitialized() : 'N/A');

Pi.authenticate(['username'])
  .then(a => alert('SUCCESS: ' + a.user.username))
  .catch(e => alert('FAILED: ' + JSON.stringify(e)));
```

### Résultats possibles:

| Résultat | Signification | Solution |
|----------|---------------|----------|
| ❌ Pas de fenêtre de consentement | Problème Dashboard (URL ou Scopes) | Vérifiez App URL et Scopes dans Dashboard |
| ⚠️ Fenêtre apparaît puis se ferme immédiatement | Scope non activé ou Sandbox | Activez "username" scope dans Dashboard |
| ✅ Fenêtre apparaît et réussit | Problème résolu! | ✅ |

---

## 📄 Page de test dédiée

Une page de test complète est disponible à:
- `https://ledgererp.online/static/test-pi-auth.html`

Cette page permet de:
- ✅ Vérifier les informations système
- ✅ Tester l'initialisation du SDK
- ✅ Tester l'authentification avec messages détaillés
- ✅ Obtenir des instructions spécifiques selon l'erreur

---

## 🆘 Messages d'erreur courants

### "Origin mismatch"
→ **Solution:** Vérifiez l'App URL dans Pi Developer Portal (voir Vérification #1)

### "Not in Pi Browser"
→ **Solution:** Ouvrez l'application dans Pi Browser (voir Vérification #2)

### "Pi SDK not loaded"
→ **Solution:** Vérifiez votre connexion internet et rechargez la page

### "Authentication timeout"
→ **Solution:** Vérifiez l'App URL, les scopes, et votre connexion

### "Pi.authenticate is not a function"
→ **Solution:** Le SDK n'est pas chargé correctement. Rechargez la page.

---

## 📞 Support

Si le problème persiste après avoir vérifié tous les points ci-dessus:

1. Ouvrez la console du navigateur (F12)
2. Copiez tous les messages d'erreur
3. Notez les informations du diagnostic
4. Contactez le support avec ces informations

---

## 🔗 Liens utiles

- **📚 Pi Developer Guide (Officiel):** https://pi-apps.github.io/community-developer-guide/docs/gettingStarted
- **🔧 Pi Developer Portal:** https://developer.minepi.com
- **📖 Documentation Pi SDK:** https://developers.minepi.com
- **🌐 Votre application:** https://ledgererp.online
- **🧪 Page de test:** https://ledgererp.online/static/test-pi-auth.html

### Ressources supplémentaires du guide officiel:

Le [Pi Developer Guide](https://pi-apps.github.io/community-developer-guide/docs/gettingStarted) contient:
- ✅ Quick Start guide
- ✅ Demo Apps pour référence
- ✅ Checklist complète
- ✅ Pi Browser Introduction
- ✅ Developer Portal guide
- ✅ Pi App Platform documentation
- ✅ Pi Payments integration
- ✅ Mainnet Listing Requirements

**Note:** Ce guide de dépannage complète le guide officiel avec des solutions spécifiques aux problèmes d'authentification courants.

---

**Dernière mise à jour:** Après ajout du diagnostic automatique détaillé et référence au guide officiel

