# Journal des Décisions d'Architecture - Projet ELORA

## Décision 001 : Inspection de l'Environnement et Socle Technique (Phase 0)
- **Date :** 22 Novembre 2026
- **Auteur :** Antigravity Agent & Utilisateur
- **Statut :** Validé

### 1. Contexte et Diagnostic de l'Environnement Matériel & Logiciel
L'inspection a été menée conformément aux exigences de la Phase 0 :
- **Machine physique :** Dell Inspiron 15 7000 Series (Modèle 7537).
- **Processeur & Mémoire :** Processeur Intel Core, 8 Go de RAM physique.
- **Stockage disque :** ~28.75 Go d'espace libre sur le disque principal (amplement suffisant pour le composant Gemini Nano d'environ 4 Go et l'espace réservé Chrome de 22 Go).
- **Système d'exploitation actif :** Windows (hôte avec PowerShell).
  *Note transparente :* Le document de cadrage mentionnait un environnement sous Ubuntu 26.04 LTS. L'exécution réelle s'opère actuellement sur l'hôte Windows du Dell (WSL ne disposant d'aucune distribution installée au moment de l'inspection). L'architecture web/PWA avec Node.js et Google Chrome est 100 % multiplateforme et fonctionne de manière identique sous Windows et Ubuntu.
- **Outils installés vérifiés :**
  - **Git :** `2.55.0.windows.5` (Dépôt Git initialisé avec `.gitignore`).
  - **Node.js :** `v24.20.0` (Version moderne LTS).
  - **npm :** `11.19.0`.
  - **Navigateur Chrome :** `157.0.8103.80` (Version compatible avec le Prompt API et le moteur Optimization Guide On-Device).
  - **Firebase JS SDK :** `v13.4.0` (incluant le module natif `firebase/ai` et les modes hybrides).

---

### 2. Choix d'Architecture pour l'IA Hybride (Firebase AI Logic + Gemini Nano)
Conformément à la section 4.1 du document de cadrage :
1. **Couche d'orchestration découplée (`src/lib/ai/`) :**
   - `CapabilityDetector` : Sonde en temps réel `window.ai.languageModel`, l'état réseau (`navigator.onLine`) et la compatibilité du navigateur.
   - `TaskRouter` : Détermine l'aiguillage selon la politique de confidentialité (mode `localOnly`), l'état de connectivité réseau et la taille/complexité de la tâche.
   - `LocalAIProvider` : Interroge le moteur local Gemini Nano via Firebase AI Logic (`InferenceMode.ONLY_ON_DEVICE`) ou l'API directe Chrome Prompt API. Si le modèle local est absent, **il rejette honnêtement la demande sans jamais simuler de réponse locale factice** (Principe 2 & Test d'acceptation 3).
   - `CloudAIProvider` : Appelle les modèles distants via Firebase AI Logic (`InferenceMode.ONLY_IN_CLOUD`). Bloque immédiatement les requêtes si le réseau est coupé.
   - `AIOrchestrator` : Point d'accès unique exposant une interface stable et certifiant la source réelle (`on_device` vs `in_cloud`) directement extraite de `result.response.inferenceSource`.
   - `OfflineQueue` (`src/lib/offline/`) : Maintient les modifications locales de données en attente de synchronisation sans simuler d'inférence cloud hors ligne.

2. **Modèles cibles officiels :**
   - **Local :** Gemini Nano via l'implémentation Prompt API de Google Chrome.
   - **Cloud :** `gemini-3.5-flash-lite` (modèle par défaut officiel de Firebase AI Logic Hybrid).

---

### 3. Tests d'Acceptation Validés en Phase 0
- **Test 1 (`ONLY_ON_DEVICE`) :** Si le modèle est prêt, réponse certifiée `[ON_DEVICE]`. Si absent, refus clair sans simulation.
- **Test 2 (`ONLY_IN_CLOUD`) :** Requête vers le cloud certifiée `[IN_CLOUD]`.
- **Test 3 (`PREFER_ON_DEVICE`) :** Arbitrage automatique du SDK avec extraction de la métadonnée d'inférence.
- **Test 4 (`localOnly = true`) :** Respect strict de la vie privée — si le modèle local n'est pas opérationnel, le routage cloud est bloqué avec explication.
- **Test 5 (Mode Hors Ligne) :** Les fonctions non-IA locales restent disponibles avec file de synchronisation (`OfflineQueue`).

---

### 4. Instructions de Lancement Local
Pour démarrer le serveur de développement local :
```bash
npm run dev
```
Pour tester Gemini Nano dans Chrome :
1. Ouvrir `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**
2. Ouvrir `chrome://flags/#optimization-guide-on-device-model` → **Enabled BypassPerfRequirement**
3. Redémarrer Chrome et vérifier le téléchargement dans `chrome://components`.
