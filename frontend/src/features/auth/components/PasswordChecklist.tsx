import { CheckIcon as Check, CircleIcon as Circle } from '@phosphor-icons/react';
import './PasswordChecklist.css';

import { passwordRules } from '../passwordPolicy';

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
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          <Circle size={14} aria-hidden="true" />
                        )}
                      </span>
                      <span>{rule.label}</span>
                    </li>
                  );
                })}
              </ul>
  );
}
