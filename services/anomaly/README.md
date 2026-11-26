# Détection d'anomalies Vigil

Service Python qui lit les métriques depuis l'API Vigil, entraîne deux détecteurs par serveur et renvoie les incidents à l'API. Il n'accède pas directement à PostgreSQL.

## Installation locale (PowerShell)

Depuis `D:\dev\vigil` :

```powershell
python -m venv services\anomaly\.venv
services\anomaly\.venv\Scripts\python -m pip install -r services\anomaly\requirements.txt
$token = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:VIGIL_INTERNAL_TOKEN = $token
$token
```

Copiez la valeur affichée et configurez-la dans les deux terminaux avant de démarrer chaque processus. Dans le terminal de l'API :

```powershell
cd apps\api
npm run dev
```

Dans un second terminal, définissez **la même valeur** de `VIGIL_INTERNAL_TOKEN`, puis :

```powershell
$env:VIGIL_INTERNAL_TOKEN = "<collez ici la valeur affichée>"
cd D:\dev\vigil
services\anomaly\.venv\Scripts\python services\anomaly\anomaly_service.py
```

La base et l'API doivent être disponibles. `VIGIL_API_URL` vaut par défaut `http://127.0.0.1:4000`. Le service charge au démarrage jusqu'à sept jours d'historique (20 000 mesures au maximum), puis interroge l'API toutes les dix secondes. Donnez au moins 30 mesures à chaque serveur pour EWMA et 100 pour Isolation Forest. Les variables `VIGIL_HISTORY_DAYS`, `VIGIL_POLL_SECONDS`, `VIGIL_WARMUP_POINTS`, `VIGIL_EWMA_ALPHA`, `VIGIL_EWMA_MIN_DELTA`, `VIGIL_IF_MIN_POINTS` et `VIGIL_IF_CONTAMINATION` permettent d'ajuster l'expérience.

## Détecteurs

- **EWMA** compare CPU, RAM et disque à une moyenne exponentielle et à la variation récente. Une alerte est ouverte si l'écart dépasse le maximum entre le plancher configuré (12 points de pourcentage par défaut) et quatre fois la variation observée; elle se résout après trois mesures normales.
- **Isolation Forest** apprend les combinaisons CPU/RAM/disque/charge/réseau sur les 2 000 mesures récentes. Il s'active après 100 points et réentraîne le modèle toutes les 30 nouvelles mesures. Une alerte système se résout après cinq mesures normales.

Ces paramètres sont des valeurs de départ pour l'étude, pas des seuils scientifiquement validés. Conservez le même jeu d'expériences quand vous comparez les méthodes. Après tout changement de réglage, indiquez-le dans le rapport.

## Enregistrer une expérience

Récupérez l'UUID serveur et démarrez une expérience avant la charge. Exemple PowerShell pour un serveur nommé `omen-dev` :

```powershell
$serverId = (Invoke-RestMethod http://127.0.0.1:4000/api/v1/servers | Where-Object name -eq "omen-dev").id
$exp = & services\anomaly\.venv\Scripts\python services\anomaly\experiment.py start --server $serverId --scenario cpu | ConvertFrom-Json
$exp.id
```

Pour un test CPU de 45 secondes sur la machine surveillée, lancez une charge bornée sur ses cœurs :

```powershell
$jobs = 1..([Environment]::ProcessorCount) | ForEach-Object {
  Start-Job -ArgumentList 45 -ScriptBlock {
    param($Seconds)
    $until = [DateTime]::UtcNow.AddSeconds($Seconds)
    $x = 1.0
    while ([DateTime]::UtcNow -lt $until) { $x = [Math]::Sqrt($x + 12345) }
  }
}
Wait-Job $jobs | Out-Null
Remove-Job $jobs
```

Pendant la charge, l'incident `EWMA / cpu_pct` devrait apparaître dans la page Alertes; l'Isolation Forest peut aussi signaler une combinaison inhabituelle. Puis fermez l'expérience avec l'UUID affiché :

```powershell
services\anomaly\.venv\Scripts\python services\anomaly\experiment.py end --id $exp.id
```

Scénarios acceptés : `cpu`, `memory`, `disk`, `agent_offline`, `other`. Pour `agent_offline`, gardez l'expérience ouverte entre l'arrêt et le redémarrage de l'agent. Limitez les charges et surveillez la machine : ce dépôt n'exécute pas lui-même de commande destructive ou de remplissage de disque.

## Calculer les résultats

Après plusieurs expériences terminées :

```powershell
services\anomaly\.venv\Scripts\python services\anomaly\evaluate.py
services\anomaly\.venv\Scripts\python services\anomaly\evaluate.py --format json
```

Le rappel est la part d'expériences avec au moins une détection pendant la fenêtre injectée. La précision événementielle compte les incidents détectés dans ces fenêtres parmi les incidents de la période expérimentale. Les fausses alertes par jour ne comptent que les incidents hors fenêtres, entre la première injection et la dernière fin. Le délai moyen est calculé pour la première alerte de chaque expérience détectée. Cette mesure événementielle est utile pour comparer les méthodes, mais ne remplace pas une évaluation point par point avec des étiquettes par mesure.

Tests unitaires : `services\anomaly\.venv\Scripts\python -m unittest discover -s services\anomaly`.

## Sécurité

Configurez le même `VIGIL_INTERNAL_TOKEN` de 32 caractères minimum pour l'API Node et le service Python. Gardez-le secret et ne le commitez pas. Les routes internes sont refusées si le jeton n'est pas configuré.
