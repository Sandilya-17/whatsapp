import React, { useState } from 'react';
import { BarChart2, Plus, Trash2, X } from 'lucide-react';
import type { PollData } from '../types';

interface CreatePollModalProps {
  onClose: () => void;
  onCreatePoll: (pollData: PollData) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ onClose, onCreatePoll }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please provide a poll question');
      return;
    }

    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      setError('At least two valid options are required');
      return;
    }

    const pollData: PollData = {
      question: question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        text,
        votes: [],
      })),
      allowMultiple,
      totalVotes: 0,
    };

    onCreatePoll(pollData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="modal-title">Create Team Poll</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Collect quick feedback from participants
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Poll Question *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Which deployment window works best?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              maxLength={180}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Options *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    required={i < 2}
                    maxLength={80}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '6px',
                      }}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="btn-secondary"
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={15} /> Add Another Option
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '16px 0 20px',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
            }}
            onClick={() => setAllowMultiple(!allowMultiple)}
          >
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Allow multiple selections per user
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }}>
              Post Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
