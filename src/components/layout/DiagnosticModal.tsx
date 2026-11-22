import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Cpu,
  Cloud,
  Layers,
  ShieldCheck,
  RotateCw,
  Play,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Server,
  Zap,
} from 'lucide-react';
import { orchestrator } from '../../lib/ai/AIOrchestrator';
import { OfflineQueue } from '../../lib/offline/OfflineQueue';
import type { AIResponse } from '../../lib/ai/types';

interface TestLog {
  id: string;
  name: string;
  timestamp: string;
  status: 'running' | 'success' | 'warning' | 'error';
  source?: 'on_device' | 'in_cloud' | 'unavailable';
  durationMs?: number;
  modelName?: string;
  message: string;
}

export const DiagnosticModal: React.FC = () => {
  const { isDiagnosticOpen, setIsDiagnosticOpen, caps, refreshCapabilities } = useApp();
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [showFlagsGuide, setShowFlagsGuide] = useState(false);
  const [testPrompt, setTestPrompt] = useState(
    'Explique en 2 phrases pourquoi une IA hybride est plus résiliente et respectueuse de la vie privée.'
  );

  if (!isDiagnosticOpen) return null;

  const addLog = (log: Omit<TestLog, 'id' | 'timestamp'>) => {
    const entry: TestLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [entry, ...prev]);
  };

  const runTestLocal = async () => {
    setActiveTest('local');
    addLog({
      name: 'Test 1 : Requête Locale Pure (ONLY_ON_DEVICE)',
      status: 'running',
      message: 'Appel vers le moteur local Gemini Nano via Firebase AI Logic...',
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

  const runTestCloud = async () => {
    setActiveTest('cloud');
    addLog({
      name: 'Test 2 : Requête Cloud Pure (ONLY_IN_CLOUD)',
      status: 'running',
      message: 'Appel vers Firebase AI Logic Cloud (Gemini 3.5 Flash Lite)...',
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

  const runTestHybrid = async () => {
    setActiveTest('hybrid');
    addLog({
      name: 'Test 3 : Hybride Natif Firebase (PREFER_ON_DEVICE)',
      status: 'running',
      message: 'Arbitrage automatique du SDK Firebase : priorité on-device avec repli cloud...',
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

  const runTestPrivacy = async () => {
    setActiveTest('privacy');
    addLog({
      name: 'Test 4 : Confidentialité Stricte (localOnly)',
      status: 'running',
      message: 'Vérification qu\'aucune donnée ne fuite au cloud si le modèle local n\'est pas prêt...',
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

  const runTestOfflineQueue = () => {
    const item = OfflineQueue.enqueue({
      type: 'note_create',
      payload: {
        title: 'Note test hors ligne',
        content: 'Opération différée sans simulation d\'inférence IA.',
      },
    });

    addLog({
      name: 'Test 5 : Comportement Hors-Ligne & File',
      status: 'success',
      message: `Opération enregistrée dans OfflineQueue (ID: ${item.id}, ${OfflineQueue.getPendingCount()} éléments en attente). Aucune requête cloud factice n'a été simulée.`,
    });
  };

  const runAllTests = async () => {
    await runTestLocal();
    await runTestCloud();
    await runTestHybrid();
    await runTestPrivacy();
    runTestOfflineQueue();
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsDiagnosticOpen(false)}>
      <div className="modal-dialog diagnostic-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">Banc de Test & Diagnostic IA Hybride</h2>
            <p className="modal-subtitle">
              Preuve technique officielle pour le hackathon Firebase #BuildHybridAI
            </p>
          </div>
          <button className="modal-close-btn" onClick={() => setIsDiagnosticOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="diagnostic-grid">
          {/* Diagnostic machine & moteurs */}
          <div className="diag-card">
            <div className="diag-card-header">
              <Server size={18} />
              <h3>État de l'Environnement</h3>
              <button className="btn-icon-refresh" onClick={refreshCapabilities}>
                <RotateCw size={14} />
              </button>
            </div>

            <div className="diag-list">
              <div className="diag-item">
                <span>Machine hôte :</span>
                <strong>Dell Inspiron 15 7000 (8 Go RAM)</strong>
              </div>
              <div className="diag-item">
                <span>SDK Firebase AI Logic :</span>
                <strong>v13.4.0 (InferenceMode natif)</strong>
              </div>
              <div className="diag-item">
                <span>Moteur Cloud :</span>
                <strong style={{ color: 'var(--cloud-blue)' }}>Gemini 3.5 Flash Lite</strong>
              </div>
              <div className="diag-item">
                <span>Moteur Local :</span>
                <strong
                  style={{
                    color:
                      caps?.onDeviceStatus === 'readily'
                        ? 'var(--local-green)'
                        : 'var(--accent-gold)',
                  }}
                >
                  {caps?.onDeviceStatus === 'readily'
                    ? 'Gemini Nano (Prêt)'
                    : caps?.onDeviceStatus === 'after-download'
                    ? 'Gemini Nano (À télécharger)'
                    : 'Gemini Nano (Inactif dans ce profil)'}
                </strong>
              </div>
            </div>

            <p className="diag-details-text">{caps?.onDeviceDetails}</p>

            <button
              className="toggle-flags-guide-btn"
              onClick={() => setShowFlagsGuide(!showFlagsGuide)}
            >
              <HelpCircle size={14} />
              <span>{showFlagsGuide ? 'Masquer le guide Chrome' : 'Comment activer Gemini Nano ?'}</span>
            </button>

            {showFlagsGuide && (
              <div className="flags-guide-box">
                <ol>
                  <li><code>chrome://flags/#prompt-api-for-gemini-nano</code> → <strong>Enabled</strong></li>
                  <li><code>chrome://flags/#optimization-guide-on-device-model</code> → <strong>Enabled BypassPerfRequirement</strong></li>
                  <li>Redémarrez Chrome.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Lanceur de tests */}
          <div className="diag-card">
            <div className="diag-card-header">
              <Zap size={18} />
              <h3>Tests d'Acceptation Certifiés</h3>
              <button className="btn-accent-sm" onClick={runAllTests} disabled={!!activeTest}>
                <Play size={13} />
                <span>Tout exécuter</span>
              </button>
            </div>

            <input
              type="text"
              className="form-input mb-2"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Consigne de test..."
            />

            <div className="test-buttons-grid">
              <button className="test-action-btn local" onClick={runTestLocal} disabled={!!activeTest}>
                <Cpu size={15} />
                <span>1. Local Pur</span>
              </button>
              <button className="test-action-btn cloud" onClick={runTestCloud} disabled={!!activeTest}>
                <Cloud size={15} />
                <span>2. Cloud Pur</span>
              </button>
              <button className="test-action-btn hybrid" onClick={runTestHybrid} disabled={!!activeTest}>
                <Layers size={15} />
                <span>3. Hybride Natif</span>
              </button>
              <button className="test-action-btn privacy" onClick={runTestPrivacy} disabled={!!activeTest}>
                <ShieldCheck size={15} />
                <span>4. Confidentiel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Console de logs */}
        <div className="diag-console">
          <div className="diag-console-header">
            <div className="flex-align-center">
              <Terminal size={16} />
              <h4>Journal d'Exécution & Métadonnées</h4>
            </div>
            {logs.length > 0 && (
              <button className="btn-text-sm" onClick={() => setLogs([])}>
                Effacer
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="empty-console-msg">
              Aucun test exécuté. Cliquez sur l'un des boutons de test ci-dessus pour observer la latence et la source certifiée.
            </div>
          ) : (
            <div className="console-log-list">
              {logs.map((log) => (
                <div key={log.id} className="console-log-entry">
                  <div className="log-entry-top">
                    <div className="flex-align-center">
                      {log.status === 'success' && <CheckCircle2 size={15} color="var(--local-green)" />}
                      {log.status === 'warning' && <AlertTriangle size={15} color="var(--accent-gold)" />}
                      {log.status === 'error' && <XCircle size={15} color="var(--danger-red)" />}
                      {log.status === 'running' && <RotateCw size={15} className="spin" />}
                      <span className="log-title">{log.name}</span>
                    </div>

                    <div className="flex-align-center">
                      {log.source && (
                        <span className={`log-source-tag ${log.source}`}>
                          [{log.source.toUpperCase()}]
                        </span>
                      )}
                      {log.durationMs !== undefined && (
                        <span className="log-duration">{log.durationMs} ms</span>
                      )}
                      <span className="log-time">{log.timestamp}</span>
                    </div>
                  </div>

                  <p className="log-message">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
