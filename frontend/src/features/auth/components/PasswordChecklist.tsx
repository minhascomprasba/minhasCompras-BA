import './PasswordChecklist.css';

const passwordRules = [
  { key: 'length', label: 'Mínimo de 8 caracteres', test: (v: string) => v.length >= 8 },
  { key: 'uppercase', label: 'Uma letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'Uma letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', label: 'Um número', test: (v: string) => /\d/.test(v) },
  { key: 'special', label: 'Um caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;

  return (
              <ul className="password-checklist">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <li
                      key={rule.key}
                      className={`password-checklist-item ${passed ? 'is-valid' : ''}`}
                    >
                      <span className="password-checklist-icon" aria-hidden="true">
                        {passed ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                        )}
                      </span>
                      <span>{rule.label}</span>
                    </li>
                  );
                })}
              </ul>
  );
}
