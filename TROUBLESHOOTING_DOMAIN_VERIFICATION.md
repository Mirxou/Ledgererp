# Guide de dépannage - Vérification du domaine Pi Network

## Problème : "Connection failed. Make sure you're not using localhost as your URL."

### Vérifications locales ✅

Les fichiers locaux sont correctement configurés :
- ✅ `static/validation-key.txt` existe avec le bon hash
- ✅ `validation-key.txt` (racine) existe avec le bon hash
- ✅ `static/_headers` est configuré correctement
- ✅ `wrangler.toml` est configuré avec `pages_build_output_dir = "static"`

### Problème identifié

Le fichier n'est **pas accessible publiquement** sur le domaine `https://ledgererp.online.pinet.app/validation-key.txt`.

## Solutions

### Solution 1 : Vérifier le déploiement Cloudflare Pages

1. **Connectez-vous à Cloudflare Pages** :
   - Allez sur https://dash.cloudflare.com
   - Sélectionnez votre projet "ledgererp"

2. **Vérifiez la configuration de build** :
   - Build output directory : `static`
   - Build command : (peut être vide ou utiliser `cloudflare-pages-build.sh`)

3. **Vérifiez que le déploiement est actif** :
   - Le dernier déploiement doit être "Active"
   - Vérifiez les logs de build pour des erreurs

4. **Redeployez si nécessaire** :
   - Cliquez sur "Retry deployment" ou poussez un nouveau commit

### Solution 2 : Vérifier manuellement l'accessibilité

Testez l'URL dans votre navigateur ou avec curl :

```bash
# Dans PowerShell
Invoke-WebRequest -Uri "https://ledgererp.online.pinet.app/validation-key.txt" -UseBasicParsing

# Ou dans un navigateur
# Ouvrez : https://ledgererp.online.pinet.app/validation-key.txt
```

**Résultat attendu** :
- Status Code : 200
- Content : `b98811baf2008ea8c7ca719afd78f84b6d7c8358b4a4898b8d8ff7456f245e8adf97a7eef03a5aee7539db82b39b7fb8877640b3e24a70f58321f6ed01a0bb9c`
- Content-Type : `text/plain; charset=utf-8`

### Solution 3 : Vérifier la structure des fichiers

Pour Cloudflare Pages, le fichier doit être dans le répertoire `static/` qui est le répertoire de build output.

Structure attendue :
```
static/
  ├── validation-key.txt  ← Doit être ici
  ├── _headers            ← Configuration des en-têtes
  ├── index.html
  └── ...
```

### Solution 4 : Vérifier le format du fichier

Le fichier `validation-key.txt` doit :
- ✅ Contenir uniquement le hash (une seule ligne)
- ✅ Ne pas avoir d'espaces en début ou fin
- ✅ Ne pas avoir de saut de ligne supplémentaire

Format correct :
```
b98811baf2008ea8c7ca719afd78f84b6d7c8358b4a4898b8d8ff7456f245e8adf97a7eef03a5aee7539db82b39b7fb8877640b3e24a70f58321f6ed01a0bb9c
```

### Solution 5 : Vérifier la configuration DNS

Si le domaine vient d'être configuré :
1. Attendez la propagation DNS (peut prendre jusqu'à 48h)
2. Vérifiez avec : `nslookup ledgererp.online.pinet.app`
3. Vérifiez que le domaine pointe vers Cloudflare Pages

### Solution 6 : Vérifier les en-têtes HTTP

Le fichier `static/_headers` doit contenir :
```
/validation-key.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600
```

## Script de vérification

Utilisez le script de vérification pour diagnostiquer le problème :

```powershell
.\scripts\verify_deployment.ps1
```

Ce script vérifie :
1. ✅ Présence des fichiers locaux
2. ✅ Format et contenu des fichiers
3. ✅ Configuration Cloudflare Pages
4. ✅ Accessibilité du fichier en ligne

## Étapes de déploiement recommandées

1. **Vérifiez les fichiers locaux** :
   ```powershell
   .\scripts\verify_deployment.ps1
   ```

2. **Commitez et poussez les changements** :
   ```bash
   git add static/validation-key.txt static/_headers
   git commit -m "Add Pi Network domain verification files"
   git push
   ```

3. **Attendez le déploiement Cloudflare Pages** :
   - Vérifiez dans le dashboard Cloudflare
   - Attendez que le déploiement soit "Active"

4. **Testez l'URL** :
   - Ouvrez : https://ledgererp.online.pinet.app/validation-key.txt
   - Vérifiez que le hash s'affiche correctement

5. **Cliquez sur "Verify Domain" dans Pi Network Developer Portal**

## Contact support

Si le problème persiste après avoir suivi ces étapes :
- Vérifiez les logs Cloudflare Pages pour des erreurs
- Contactez le support Cloudflare si nécessaire
- Vérifiez que le domaine est correctement configuré dans Cloudflare
