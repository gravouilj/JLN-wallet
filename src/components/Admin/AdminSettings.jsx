import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Input, Switch, Textarea } from '../UI';
import { supabase } from '../../services/supabaseClient';

/**
 * AdminSettings - Paramètres de l'administration
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Sections :
 * - Configuration CTA (Call-to-Action dans le directory)
 * - Délais de réponse pour les tickets
 * - Notifications admin
 * 
 * @param {Object} props
 * @param {Function} props.onNotification - Callback pour afficher des notifications
 */
const AdminSettings = ({ onNotification }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Configuration CTA
  const [ctaConfig, setCtaConfig] = useState({
    enabled: true,
    position: 3, // Position dans le directory (après X fermes)
    message: 'Devenez créateur et soutenez l\'agriculture locale !',
    frequency: 1, // Afficher tous les X scroll
    buttonText: 'En savoir plus',
    targetUrl: '/landingpage'
  });

  // Délais de réponse
  const [responseDelay, setResponseDelay] = useState({
    creator_default: 48, // heures
    report_urgent: 24,
    report_normal: 72,
    auto_action: 'hide', // 'hide', 'suspend', 'none'
    send_reminder: true,
    reminder_hours: 24
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    email_new_ticket: true,
    email_urgent_report: true,
    email_deadline_approaching: true,
    slack_webhook: '',
    discord_webhook: ''
  });

  // Charger les paramètres
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Charger depuis admin_settings
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');

      if (error) throw error;

      // Parser les settings
      if (data) {
        data.forEach(setting => {
          if (setting.setting_key === 'cta_config') {
            setCtaConfig({ ...ctaConfig, ...setting.setting_value });
          } else if (setting.setting_key === 'response_delay') {
            setResponseDelay({ ...responseDelay, ...setting.setting_value });
          } else if (setting.setting_key === 'notifications') {
            setNotifications({ ...notifications, ...setting.setting_value });
          }
        });
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors du chargement des paramètres' 
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key, value) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      onNotification?.({ 
        type: 'success', 
        message: 'Paramètres enregistrés' 
      });
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      onNotification?.({ 
        type: 'error', 
        message: 'Erreur lors de la sauvegarde' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8 text-secondary">
        ⏳ Chargement des paramètres...
      </div>
    );
  }

  return (
    <div className="admin-settings d-flex flex-column gap-5">
      {/* Section CTA */}
      <Card>
        <CardContent className="p-5">
          <div className="d-flex align-center justify-between mb-4 pb-4" style={{
            borderBottom: '1px solid var(--border-primary)'
          }}>
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                📢 Configuration CTA
              </h3>
              <p className="text-sm text-secondary">
                Appels à l'action dans le directory pour encourager l'inscription des créateurs
              </p>
            </div>
            <Switch
              checked={ctaConfig.enabled}
              onChange={(checked) => {
                setCtaConfig({ ...ctaConfig, enabled: checked });
                saveSetting('cta_config', { ...ctaConfig, enabled: checked });
              }}
              label={ctaConfig.enabled ? 'Activé' : 'Désactivé'}
            />
          </div>

          {ctaConfig.enabled && (
            <div className="d-flex flex-column gap-4">
              <div>
                <label className="text-sm font-medium text-primary d-block mb-2">
                  📍 Position dans le directory
                </label>
                <Input
                  type="number"
                  min="1"
                  value={ctaConfig.position}
                  onChange={(e) => setCtaConfig({ ...ctaConfig, position: parseInt(e.target.value) })}
                  placeholder="Ex: 3 (après 3 fermes)"
                />
                <p className="text-xs text-secondary mt-1">
                  Afficher un CTA après X fermes dans la liste
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-primary d-block mb-2">
                  📝 Message principal
                </label>
                <Textarea
                  value={ctaConfig.message}
                  onChange={(e) => setCtaConfig({ ...ctaConfig, message: e.target.value })}
                  rows={2}
                  placeholder="Votre message d'incitation..."
                />
              </div>

              <div className="d-flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-primary d-block mb-2">
                    🔘 Texte du bouton
                  </label>
                  <Input
                    value={ctaConfig.buttonText}
                    onChange={(e) => setCtaConfig({ ...ctaConfig, buttonText: e.target.value })}
                    placeholder="En savoir plus"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-primary d-block mb-2">
                    🔗 URL cible
                  </label>
                  <Input
                    value={ctaConfig.targetUrl}
                    onChange={(e) => setCtaConfig({ ...ctaConfig, targetUrl: e.target.value })}
                    placeholder="/landingpage"
                  />
                </div>
              </div>

              <Button
                onClick={() => saveSetting('cta_config', ctaConfig)}
                disabled={saving}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
              >
                {saving ? '⏳ Enregistrement...' : '💾 Enregistrer CTA'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Délais */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            ⏰ Délais de Réponse
          </h3>
          <p className="text-sm text-secondary mb-4">
            Définir les délais de réponse pour les tickets et actions automatiques
          </p>

          <div className="d-flex flex-column gap-4">
            <div>
              <label className="text-sm font-medium text-primary d-block mb-2">
                🌾 Délai créateur (heures)
              </label>
              <Input
                type="number"
                min="1"
                value={responseDelay.creator_default}
                onChange={(e) => setResponseDelay({ ...responseDelay, creator_default: parseInt(e.target.value) })}
              />
              <p className="text-xs text-secondary mt-1">
                Temps accordé au créateur pour répondre à une demande admin
              </p>
            </div>

            <div className="d-flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-primary d-block mb-2">
                  🚨 Report urgent (heures)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={responseDelay.report_urgent}
                  onChange={(e) => setResponseDelay({ ...responseDelay, report_urgent: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-primary d-block mb-2">
                  📋 Report normal (heures)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={responseDelay.report_normal}
                  onChange={(e) => setResponseDelay({ ...responseDelay, report_normal: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-primary d-block mb-2">
                ⚡ Action automatique si délai dépassé
              </label>
              <select
                value={responseDelay.auto_action}
                onChange={(e) => setResponseDelay({ ...responseDelay, auto_action: e.target.value })}
                className="w-full p-3 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="none">Aucune action</option>
                <option value="hide">🙈 Masquer le profil</option>
                <option value="suspend">⏸️ Suspendre le profil</option>
              </select>
            </div>

            <div>
              <Switch
                checked={responseDelay.send_reminder}
                onChange={(checked) => setResponseDelay({ ...responseDelay, send_reminder: checked })}
                label="Envoyer un rappel avant échéance"
              />
              {responseDelay.send_reminder && (
                <Input
                  type="number"
                  min="1"
                  value={responseDelay.reminder_hours}
                  onChange={(e) => setResponseDelay({ ...responseDelay, reminder_hours: parseInt(e.target.value) })}
                  className="mt-2"
                  placeholder="Heures avant échéance"
                />
              )}
            </div>

            <Button
              onClick={() => saveSetting('response_delay', responseDelay)}
              disabled={saving}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white'
              }}
            >
              {saving ? '⏳ Enregistrement...' : '💾 Enregistrer Délais'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section Notifications */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            🔔 Notifications Admin
          </h3>
          <p className="text-sm text-secondary mb-4">
            Configurer les alertes pour les événements importants
          </p>

          <div className="d-flex flex-column gap-3">
            <Switch
              checked={notifications.email_new_ticket}
              onChange={(checked) => setNotifications({ ...notifications, email_new_ticket: checked })}
              label="📧 Email pour nouveau ticket"
            />
            
            <Switch
              checked={notifications.email_urgent_report}
              onChange={(checked) => setNotifications({ ...notifications, email_urgent_report: checked })}
              label="🚨 Email pour signalement urgent"
            />
            
            <Switch
              checked={notifications.email_deadline_approaching}
              onChange={(checked) => setNotifications({ ...notifications, email_deadline_approaching: checked })}
              label="⏰ Email pour échéance proche"
            />

            <div className="pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
              <label className="text-sm font-medium text-primary d-block mb-2">
                💬 Webhook Slack (optionnel)
              </label>
              <Input
                value={notifications.slack_webhook}
                onChange={(e) => setNotifications({ ...notifications, slack_webhook: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-primary d-block mb-2">
                💬 Webhook Discord (optionnel)
              </label>
              <Input
                value={notifications.discord_webhook}
                onChange={(e) => setNotifications({ ...notifications, discord_webhook: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>

            <Button
              onClick={() => saveSetting('notifications', notifications)}
              disabled={saving}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white'
              }}
            >
              {saving ? '⏳ Enregistrement...' : '💾 Enregistrer Notifications'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
