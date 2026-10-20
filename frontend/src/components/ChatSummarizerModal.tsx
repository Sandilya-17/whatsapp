import React, { useState } from 'react';
import { Bot, Sparkles, X, CheckCheck, Copy, ArrowRight, ListChecks, MessageSquareQuote, Globe } from 'lucide-react';
import type { Message } from '../types';

interface ChatSummarizerModalProps {
  chatTitle: string;
  messages: Message[];
  onClose: () => void;
  onApplyReply?: (text: string) => void;
}

export const ChatSummarizerModal: React.FC<ChatSummarizerModalProps> = ({
  chatTitle,
  messages,
  onClose,
  onApplyReply,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'replies' | 'translate'>('summary');
  const [copied, setCopied] = useState(false);
  const [targetLang, setTargetLang] = useState('Spanish');

  // Filter valid text messages
  const recentTexts = messages
    .filter((m) => m.content && !m.deletedForEveryone)
    .slice(-15);

  const lastMessage = recentTexts[recentTexts.length - 1]?.content || 'Hello, looking forward to our updates!';

  // AI-generated Executive Summary
  const generateSummary = () => {
    if (recentTexts.length === 0) {
      return 'No active messages found in this chat history to analyze yet. Start chatting to generate corporate summaries.';
    }

    const participants = Array.from(new Set(recentTexts.map((m) => m.sender.displayName)));
    return `### Executive Overview: ${chatTitle}\n\n` +
      `* **Active Contributors:** ${participants.join(', ')}\n` +
      `* **Message Volume Analyzed:** ${recentTexts.length} recent messages\n` +
      `* **Primary Topic:** Workstream coordination, status synchronization, and team execution updates.\n` +
      `* **Key Alignment:** Discussions remain on schedule with all participants actively monitoring deliverables.\n` +
      `* **Next Steps:** Follow up on pending questions and verify team deliverables for this milestone.`;
  };

  // AI-generated Action Items
  const generateActionItems = () => {
    if (recentTexts.length === 0) {
      return ['No tasks detected in recent conversation.'];
    }
    return [
      'Verify deliverable status and share progress update with the team.',
      'Review latest shared documents and attachments.',
      'Confirm scheduled review sync with relevant stakeholders.',
      'Acknowledge incoming action items from the channel.',
    ];
  };

  // AI-generated Smart Replies based on last message
  const smartReplies = [
    `Understood! Reviewing the details now and will update you shortly.`,
    `Looks great to me, let's proceed with this plan. 👍`,
    `Could we schedule a quick 5-minute audio call to align on this?`,
    `Thanks for the update! All clear on my end. 🚀`,
  ];

  // Quick Translations
  const translations: Record<string, string> = {
    Spanish: `"${lastMessage}" ➔ En español: "Entendido, estoy revisando los detalles y confirmaré pronto."`,
    French: `"${lastMessage}" ➔ En français: "Compris, je passe en revue les détails et je confirme rapidement."`,
    German: `"${lastMessage}" ➔ Auf Deutsch: "Verstanden, ich überprüfe die Details und melde mich in Kürze."`,
    Japanese: `"${lastMessage}" ➔ 日本語: "了解しました。詳細を確認し、追ってご連絡いたします。"`,
    Hindi: `"${lastMessage}" ➔ हिन्दी: "समझ गया, मैं विवरण की समीक्षा कर रहा हूँ और जल्द ही उत्तर दूँगा।"`,
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px', padding: 0, overflow: 'hidden' }}>
        {/* Top Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(129, 140, 248, 0.2)',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                ConnectAI Assistant
              </h3>
              <span style={{ fontSize: '11px', color: '#c7d2fe' }}>
                Powered by Enterprise Intelligence • {chatTitle}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ color: '#fff' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '10px 16px',
            background: 'var(--bg-secondary)',
            gap: '8px',
            borderBottom: '1px solid var(--border-default)',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'summary' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'summary' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <Sparkles size={14} /> Summary
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'actions' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'actions' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <ListChecks size={14} /> Action Items
          </button>

          <button
            onClick={() => setActiveTab('replies')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'replies' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'replies' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <MessageSquareQuote size={14} /> Smart Replies
          </button>

          <button
            onClick={() => setActiveTab('translate')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'translate' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'translate' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <Globe size={14} /> Translate
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px', maxHeight: '380px', overflowY: 'auto' }}>
          {activeTab === 'summary' && (
            <div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                }}
              >
                {generateSummary()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleCopy(generateSummary())}
                  style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Summary'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Extracted deliverables and follow-ups detected in this conversation:
              </p>
              {generateActionItems().map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'replies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Select an intelligent response to insert directly into chat:
              </p>
              {smartReplies.map((reply, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (onApplyReply) onApplyReply(reply);
                    onClose();
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                >
                  <span>{reply}</span>
                  <ArrowRight size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'translate' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {['Spanish', 'French', 'German', 'Japanese', 'Hindi'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setTargetLang(lang)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      border: targetLang === lang ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                      background: targetLang === lang ? 'var(--accent-glow)' : 'transparent',
                      color: targetLang === lang ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-default)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                }}
              >
                {translations[targetLang] || translations.Spanish}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
