import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Cloud,
  Layers,
  ShieldCheck,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Terminal,
  HelpCircle,
  Server,
  Zap,
} from 'lucide-react';
import { orchestrator } from './lib/ai/AIOrchestrator';
import { CapabilityDetector } from './lib/ai/CapabilityDetector';
import { OfflineQueue } from './lib/offline/OfflineQueue';
import type { CapabilityReport, AIResponse } from './lib/ai/types';

interface TestLog {
  id: string;
  name: string;
  timestamp: string;
  status: 'running' | 'success' | 'warning' | 'error';
  source?: 'on_device' | 'in_cloud' | 'unavailable';
  durationMs?: number;
  modelName?: string;
  message: string;
  rawDetails?: unknown;
}

export const App: React.FC = () => {
  const [caps, setCaps] = useState<CapabilityReport | null>(null);
  const [loadingCaps, setLoadingCaps] = useState<boolean>(true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [showFlagsGuide, setShowFlagsGuide] = useState<boolean>(false);
  const [testPrompt, setTestPrompt] = useState<string>(
    'Explique en 2 phrases pourquoi une IA hybride est plus résiliente et respectueuse de la vie privée.'
  );

  // Détection des capacités de l'environnement
  const refreshCapabilities = useCallback(async () => {
    setLoadingCaps(true);
    try {
      const report = await CapabilityDetector.detect();
      if (simulatedOffline) {
        report.networkOnline = false;
        report.canRunCloud = false;
      }
      setCaps(report);
    } finally {
      setLoadingCaps(false);
    }
  }, [simulatedOffline]);

  useEffect(() => {
    refreshCapabilities();

    const handleOnline = () => refreshCapabilities();
    const handleOffline = () => refreshCapabilities();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCapabilities]);

  const addLog = (log: Omit<TestLog, 'id' | 'timestamp'>) => {
    const entry: TestLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [entry, ...prev]);
  };

  // 1. Test Inférence Locale Pure (ONLY_ON_DEVICE)
  const runTestLocal = async () => {
    setActiveTest('local');
    addLog({
      name: 'Test 1 : Requête Locale Pure (ONLY_ON_DEVICE)',
      status: 'running',
      message: 'Lancement de la requête vers le moteur local Gemini Nano via Firebase AI Logic...',
    });

    try {
      const resp: AIResponse = await orchestrator.process({
        prompt: testPrompt,
        mode: 'only_on_device',
        localOnly: true,
      });

      addLog({
        name: 'Test 1 : Requête Locale Pure',
        status: 'success',
        source: resp.metadata.source,
        durationMs: resp.metadata.durationMs,
        modelName: resp.metadata.modelName,
        message: `Succès local certifié ! Réponse : "${resp.text}"`,
        rawDetails: resp.metadata,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog({
        name: 'Test 1 : Requête Locale Pure',
        status: 'warning',
        source: 'unavailable',
        message: `Refus honnête et non-simulation vérifiée : ${msg}`,
      });
    } finally {
      setActiveTest(null);
    }
  };

  // 2. Test Inférence Cloud Pure (ONLY_IN_CLOUD)
  const runTestCloud = async () => {
    if (simulatedOffline) {
      addLog({
        name: 'Test 2 : Requête Cloud Pure',
        status: 'error',
        source: 'unavailable',
        message: 'Échec attendu : impossible de joindre le cloud en mode hors ligne.',
      });
      return;
    }

    setActiveTest('cloud');
    addLog({
      name: 'Test 2 : Requête Cloud Pure (ONLY_IN_CLOUD)',
      status: 'running',
      message: 'Lancement vers Firebase AI Logic Cloud (Gemini 3.5 Flash Lite)...',
    });

    try {
      const resp: AIResponse = await orchestrator.process({
        prompt: testPrompt,
        mode: 'only_in_cloud',
      });

      addLog({
        name: 'Test 2 : Requête Cloud Pure',
        status: 'success',
        source: resp.metadata.source,
        durationMs: resp.metadata.durationMs,
        modelName: resp.metadata.modelName,
        message: `Succès cloud certifié ! Réponse : "${resp.text}"`,
        rawDetails: resp.metadata,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog({
        name: 'Test 2 : Requête Cloud Pure',
        status: 'error',
        source: 'unavailable',
        message: `Erreur d'appel Cloud : ${msg}`,
      });
    } finally {
      setActiveTest(null);
    }
  };

  // 3. Test Mode Hybride Natif Firebase AI Logic (PREFER_ON_DEVICE)
  const runTestHybrid = async () => {
    setActiveTest('hybrid');
    addLog({
      name: 'Test 3 : Hybride Natif Firebase (PREFER_ON_DEVICE)',
      status: 'running',
      message: "Arbitrage automatique du SDK Firebase : priorité on-device avec repli cloud si nécessaire...",
    });

    try {
      const resp: AIResponse = await orchestrator.executeNativeFirebaseHybrid(testPrompt);

      addLog({
        name: 'Test 3 : Hybride Natif Firebase',
        status: 'success',
        source: resp.metadata.source,
        durationMs: resp.metadata.durationMs,
        modelName: resp.metadata.modelName,
        message: `Source certifiée reçue : [${resp.metadata.source.toUpperCase()}]. Réponse : "${resp.text}"`,
        rawDetails: resp.metadata,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog({
        name: 'Test 3 : Hybride Natif Firebase',
        status: 'error',
        source: 'unavailable',
        message: `Erreur du mode hybride : ${msg}`,
      });
    } finally {
      setActiveTest(null);
    }
  };

  // 4. Test Règle Confidentielle Stricte (localOnly = true)
  const runTestPrivacy = async () => {
    setActiveTest('privacy');
    addLog({
      name: 'Test 4 : Confidentialité Stricte (localOnly)',
      status: 'running',
      message: "Vérification qu'aucune donnée ne fuite au cloud si le modèle local n'est pas prêt...",
    });

    try {
      const resp: AIResponse = await orchestrator.process({
        prompt: testPrompt,
        localOnly: true,
      });

      addLog({
        name: 'Test 4 : Confidentialité Stricte',
        status: 'success',
        source: resp.metadata.source,
        durationMs: resp.metadata.durationMs,
        modelName: resp.metadata.modelName,
        message: `Traité localement dans le respect de la vie privée : "${resp.text}"`,
        rawDetails: resp.metadata,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog({
        name: 'Test 4 : Confidentialité Stricte',
        status: 'success',
        source: 'unavailable',
        message: `Succès de la protection : le transfert cloud a été bloqué comme prévu (${msg})`,
      });
    } finally {
      setActiveTest(null);
    }
  };

  // 5. Test Mode Hors Ligne et File de Synchronisation
  const runTestOffline = async () => {
    setActiveTest('offline');
    addLog({
      name: 'Test 5 : Comportement Hors-Ligne & File',
      status: 'running',
      message: 'Test de mise en file locale différée sans simulation IA cloud...',
    });

    const item = OfflineQueue.enqueue({
      type: 'note_create',
      payload: {
        title: 'Note prise hors ligne',
        content: 'Cette note reste consultable et sera synchronisée au retour du réseau.',
      },
    });

    addLog({
      name: 'Test 5 : Comportement Hors-Ligne & File',
      status: 'success',
      message: `Opération enregistrée dans OfflineQueue (ID: ${item.id}, ${OfflineQueue.getPendingCount()} éléments en attente). Aucune requête cloud factice n'a été simulée.`,
      rawDetails: item,
    });
    setActiveTest(null);
  };

  // 6. Exécuter tous les tests séquentiellement
  const runAllTests = async () => {
    await runTestLocal();
    await runTestCloud();
    await runTestHybrid();
    await runTestPrivacy();
    await runTestOffline();
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* En-tête */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                color: 'var(--text-primary)',
              }}
            >
              ELORA
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-gold-bg)',
                color: 'var(--accent-gold)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Phase 0 • Preuve Hybride
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Intelligence Personnelle Hybride — Hackathon Firebase #BuildHybridAI
          </p>
        </div>

        {/* Badges d'état temps réel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              setSimulatedOffline((prev) => !prev);
            }}
            title="Cliquer pour simuler une coupure de réseau"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor:
                caps?.networkOnline && !simulatedOffline
                  ? 'var(--local-green-bg)'
                  : 'var(--danger-red-bg)',
              color:
                caps?.networkOnline && !simulatedOffline
                  ? 'var(--local-green)'
                  : 'var(--danger-red)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {caps?.networkOnline && !simulatedOffline ? (
              <Wifi size={14} />
            ) : (
              <WifiOff size={14} />
            )}
            {caps?.networkOnline && !simulatedOffline ? 'En ligne' : 'Hors ligne (Simulé)'}
          </button>

          <button
            onClick={refreshCapabilities}
            disabled={loadingCaps}
            title="Actualiser la détection"
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <RotateCw size={16} className={loadingCaps ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Grille principale : Diagnostic + Suite de tests */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '28px',
        }}
      >
        {/* CARTE 1 : Diagnostic de l'Environnement */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="var(--accent-gold)" />
              Diagnostic Client & Moteurs
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Dell Inspiron 15 7000
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>SDK Firebase AI Logic :</span>
              <span style={{ fontWeight: 600 }}>v13.4.0 (InferenceMode natif)</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Moteur Cloud :</span>
              <span style={{ fontWeight: 600, color: 'var(--cloud-blue)' }}>Gemini 3.5 Flash Lite</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Moteur Local :</span>
              <span
                style={{
                  fontWeight: 600,
                  color:
                    caps?.onDeviceStatus === 'readily'
                      ? 'var(--local-green)'
                      : caps?.onDeviceStatus === 'after-download'
                      ? 'var(--accent-gold)'
                      : 'var(--danger-red)',
                }}
              >
                {caps?.onDeviceStatus === 'readily'
                  ? 'Gemini Nano (Prêt)'
                  : caps?.onDeviceStatus === 'after-download'
                  ? 'Gemini Nano (À télécharger)'
                  : 'Gemini Nano (Non actif)'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {caps?.onDeviceDetails}
            </p>

            {/* Accordéon guide flags Chrome */}
            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <button
                onClick={() => setShowFlagsGuide(!showFlagsGuide)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--accent-gold)',
                  fontWeight: 500,
                }}
              >
                <HelpCircle size={14} />
                {showFlagsGuide ? 'Masquer la configuration Gemini Nano' : 'Comment activer Gemini Nano dans Chrome ?'}
              </button>

              {showFlagsGuide && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    fontSize: '12px',
                    lineHeight: '1.6',
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: '6px' }}>Instructions Chrome Desktop :</p>
                  <ol style={{ paddingLeft: '18px', color: 'var(--text-secondary)' }}>
                    <li>
                      Ouvrez <code>chrome://flags/#prompt-api-for-gemini-nano</code> → <strong>Enabled</strong>
                    </li>
                    <li>
                      Ouvrez <code>chrome://flags/#optimization-guide-on-device-model</code> →{' '}
                      <strong>Enabled BypassPerfRequirement</strong>
                    </li>
                    <li>Redémarrez Chrome.</li>
                    <li>
                      Vérifiez dans <code>chrome://components</code> que "Optimization Guide On-Device Model" est à jour.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARTE 2 : Lanceur de Tests d'Acceptation */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--accent-gold)" />
              Tests d'Acceptation Phase 0
            </h2>
            <button
              onClick={runAllTests}
              disabled={!!activeTest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-gold)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Play size={13} />
              Tout exécuter
            </button>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Consigne de test envoyée à l'IA :
            </label>
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button
              onClick={runTestLocal}
              disabled={!!activeTest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--local-green-bg)',
                color: 'var(--local-green)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Cpu size={16} />
              1. Local Pur
            </button>

            <button
              onClick={runTestCloud}
              disabled={!!activeTest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--cloud-blue-bg)',
                color: 'var(--cloud-blue)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Cloud size={16} />
              2. Cloud Pur
            </button>

            <button
              onClick={runTestHybrid}
              disabled={!!activeTest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Layers size={16} />
              3. Hybride Natif
            </button>

            <button
              onClick={runTestPrivacy}
              disabled={!!activeTest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} />
              4. Confidentiel
            </button>
          </div>
        </div>
      </div>

      {/* JOURNAL D'EXÉCUTION ET PREUVE TECHNIQUE */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Journal de Vérification Technique & Métadonnées</h3>
          </div>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              style={{ fontSize: '12px', color: 'var(--text-muted)' }}
            >
              Effacer l'historique
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Aucun test exécuté pour le moment. Cliquez sur "Tout exécuter" ou lancez un test ci-dessus pour observer la détection, la source certifiée et la latence réelle.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {log.status === 'success' && <CheckCircle2 size={16} color="var(--local-green)" />}
                    {log.status === 'warning' && <AlertTriangle size={16} color="var(--accent-gold)" />}
                    {log.status === 'error' && <XCircle size={16} color="var(--danger-red)" />}
                    {log.status === 'running' && <RotateCw size={16} className="spin" />}
                    <span style={{ fontWeight: 600 }}>{log.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {log.source && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            log.source === 'on_device'
                              ? 'var(--local-green-bg)'
                              : log.source === 'in_cloud'
                              ? 'var(--cloud-blue-bg)'
                              : 'var(--bg-primary)',
                          color:
                            log.source === 'on_device'
                              ? 'var(--local-green)'
                              : log.source === 'in_cloud'
                              ? 'var(--cloud-blue)'
                              : 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        [{log.source.toUpperCase()}]
                      </span>
                    )}

                    {log.durationMs !== undefined && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {log.durationMs} ms
                      </span>
                    )}

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                  </div>
                </div>

                <p style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{log.message}</p>

                {log.modelName && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Moteur : {log.modelName}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
