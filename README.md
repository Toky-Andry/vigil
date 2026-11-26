# Vigil

Vigil surveille des serveurs, collecte leurs métriques et signale les incidents avec des seuils fixes, EWMA et Isolation Forest.

## Prérequis

- Windows avec PowerShell, Node.js et npm
- Python 3.11 ou 3.12 pour le service d'anomalies
- Docker Desktop si PostgreSQL n'est pas déjà démarré

## Premier démarrage

Ouvrez PowerShell à la racine du dépôt (`D:\dev\vigil`). Les étapes d'installation ci-dessous sont à faire une seule fois.

1. Préparez les fichiers locaux :

   ```powershell
   Copy-Item .env.example .env
   Copy-Item apps\api\.env.example apps\api\.env
   Copy-Item apps\agent\.env.example apps\agent\.env
   ```

2. Si PostgreSQL n'est pas déjà en marche, démarrez-le :

   ```powershell
   docker compose --env-file .env -f infra/docker-compose.yml up -d
   docker ps
   ```

   Attendez que `vigil-db` soit `healthy`. Si votre base tourne déjà, ne relancez pas cette étape.

3. Sur une base vide uniquement, appliquez les scripts SQL dans l'ordre :

   ```powershell
   Get-Content infra\db\001_init.sql | docker exec -i vigil-db psql -U vigil -d vigil
   Get-Content infra\db\002_indexes.sql | docker exec -i vigil-db psql -U vigil -d vigil
   Get-Content infra\db\003_alerts.sql | docker exec -i vigil-db psql -U vigil -d vigil
   ```

   Ne les rejouez pas sur une base qui contient déjà les tables Vigil.

4. Installez les dépendances Node, dans chaque dossier :

   ```powershell
   cd apps\api; npm install
   cd ..\agent; npm install
   cd ..\web; npm install
   cd ..\..
   ```

5. Créez l'environnement Python :

   ```powershell
   python -m venv services\anomaly\.venv
   & .\services\anomaly\.venv\Scripts\python.exe -m pip install -r .\services\anomaly\requirements.txt
   ```

6. Créez une clé API pour le serveur surveillé. Cette commande est à faire une fois par serveur :

   ```powershell
   cd apps\api
   npm run server:create -- omen-dev 127.0.0.1 Windows
   ```

   Copiez la clé `vgl...` affichée une seule fois dans `apps\agent\.env`, après `VIGIL_API_KEY=`. Ne la partagez pas et ne la commitez pas. Revenez ensuite à la racine : `cd ..\..`.

7. Générez un jeton interne aléatoire à partager entre l'API et le service Python :

   ```powershell
   $bytes = New-Object 'System.Byte[]' 32
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($bytes)
   $token = [Convert]::ToBase64String($bytes)
   $rng.Dispose()
   $token
   ```

   Copiez la valeur affichée dans `apps\api\.env`, après `VIGIL_INTERNAL_TOKEN=`. Gardez-la secrète. Elle est différente de la clé `vgl...` de l'agent.

## Démarrer Vigil

Gardez les services ouverts dans quatre terminaux PowerShell. L'API, l'agent et le site nécessitent chacun leur terminal. Le service Python doit aussi tourner pour la détection adaptative.

**Terminal 1 — API Node** (l'API lit `apps/api/.env`) :

```powershell
cd D:\dev\vigil\apps\api
npm run dev
```

Attendez `Server listening at http://127.0.0.1:4000`.

**Terminal 2 — agent** :

```powershell
cd D:\dev\vigil\apps\agent
npm run dev
```

Les lignes `ok cpu=... ram=... disk=...` confirment l'envoi des mesures.

**Terminal 3 — détection Python** :

```powershell
cd D:\dev\vigil
$env:VIGIL_API_URL = "http://127.0.0.1:4000"
$env:VIGIL_INTERNAL_TOKEN = "COLLEZ_ICI_LE_MEME_JETON_QUE_DANS_apps_api_.env"
& .\services\anomaly\.venv\Scripts\python.exe .\services\anomaly\anomaly_service.py
```

Ce terminal doit utiliser le même jeton que l'API. Une fois ce terminal fermé, cette variable disparaît. Ne collez jamais le vrai jeton dans un ticket ou une conversation.

**Terminal 4 — site web** :

```powershell
cd D:\dev\vigil\apps\web
npm run dev
```

Ouvrez <http://localhost:3000>. Les pages Overview, Servers, Alerts, Incidents et Detection methods utilisent les données de l'API sur le port 4000.

## Vérifier le fonctionnement

Dans un autre terminal PowerShell, vérifiez que l'API répond et qu'elle reçoit le serveur :

```powershell
Invoke-RestMethod http://127.0.0.1:4000/health
Invoke-RestMethod http://127.0.0.1:4000/api/v1/servers | ConvertTo-Json -Depth 4
```

La première commande renvoie `status: ok`. Dans la seconde, le serveur doit passer à `online` après l'envoi des mesures. Sur le site, ouvrez **Detection methods** pour voir le résumé des expériences déjà enregistrées. Les chiffres restent provisoires tant qu'il y a peu d'expériences.

## Tests et expériences

Tests unitaires Python :

```powershell
cd D:\dev\vigil
& .\services\anomaly\.venv\Scripts\python.exe -m unittest discover -s services\anomaly
```

Les tests de panne manuels et le calcul détaillé des résultats sont décrits dans [services/anomaly/README.md](services/anomaly/README.md). Une expérience ne crée pas elle-même une panne : commencez-la avant de lancer une charge contrôlée, puis terminez-la après.

## Fichiers locaux et secrets

Les fichiers `.env`, les clés d'agent et le jeton interne sont locaux et ignorés par Git. Ne faites pas `git add -f` sur ces fichiers. `.env.example` contient des exemples, pas des secrets réels.
