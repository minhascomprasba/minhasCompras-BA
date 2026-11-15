import { useRef, useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../../components/ui/input-otp';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

type AccessKeyInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: (element: HTMLInputElement | null) => void;
  error?: string;
  disabled?: boolean;
};

const GROUP_COUNT = 11;
const GROUP_SIZE = 4;

export function AccessKeyInput({ value, onChange, onBlur, inputRef, error, disabled }: AccessKeyInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [entryError, setEntryError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.replace(/\s/g, '');
  // Separators preserve empty groups while the user edits an earlier block.
  const parts = value.includes(' ') ? value.split(' ') : digits.match(/.{1,4}/g) ?? [];
  const groups = Array.from({ length: GROUP_COUNT }, (_, index) => parts[index] ?? '');
  const message = entryError || error;

  const normalize = (text: string) => {
    const normalized = text.replace(/\s/g, '');
    if (/\D/.test(normalized)) {
      setEntryError('Use apenas números e espaços na chave de acesso.');
      return null;
    }
    if (normalized.length > 44) {
      setEntryError('A chave deve ter 44 dígitos. Confira o conteúdo colado.');
      return null;
    }
    setEntryError('');
    return normalized;
  };

  const focusGroup = (index: number) => {
    inputs.current[index]?.focus();
    inputs.current[index]?.select();
  };

  const updateGroup = (index: number, text: string) => {
    const normalized = normalize(text);
    if (normalized === null) return;
    const next = [...groups];
    if (normalized.length <= GROUP_SIZE) {
      next[index] = normalized;
      onChange(next.join(' '));
      if (normalized.length === GROUP_SIZE && index < GROUP_COUNT - 1) focusGroup(index + 1);
      return;
    }

    // A complete key pasted anywhere replaces all blocks.
    const start = normalized.length === 44 ? 0 : index;
    const chunks = normalized.match(/.{1,4}/g) ?? [];
    if (start + chunks.length > GROUP_COUNT) {
      setEntryError('Não há espaço para esses dígitos. Cole a chave completa ou confira o bloco.');
      return;
    }
    chunks.forEach((chunk, offset) => { next[start + offset] = chunk; });
    onChange(next.join(' '));
    focusGroup(Math.min(start + chunks.length, GROUP_COUNT - 1));
  };

  return (
    <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0" disabled={disabled}>
      <legend className="text-sm font-medium">Chave de acesso (44 dígitos)</legend>
      <p id="access-key-help" className="text-sm text-muted-foreground">
        Digite ou cole os 44 dígitos da nota. Espaços são aceitos.
      </p>
      <Collapsible open={expanded} onOpenChange={(open) => { setExpanded(open); setEntryError(''); }} className="space-y-3">
        <CollapsibleTrigger render={<Button type="button" variant="outline" className="min-h-11" />}>
          {expanded ? 'Usar campo único' : 'Digitar por blocos'}
        </CollapsibleTrigger>
        {!expanded && (
          <Input
            ref={inputRef}
            aria-label="Chave de acesso (44 dígitos)"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="Digite ou cole a chave"
            className="min-h-11 font-mono text-base"
            value={digits}
            aria-invalid={!!message}
            aria-describedby={`access-key-help access-key-progress${message ? ' access-key-error' : ''}`}
            onChange={(event) => {
              const normalized = normalize(event.target.value);
              if (normalized !== null) onChange(normalized);
            }}
            onBlur={onBlur}
          />
        )}
        <CollapsibleContent>
          <div className="flex flex-wrap gap-3">
            {groups.map((group, index) => (
              <div key={index} onPasteCapture={(event) => {
                // Intercept before Input OTP limits the paste to this four-digit block.
                event.preventDefault();
                event.stopPropagation();
                updateGroup(index, event.clipboardData.getData('text'));
              }}>
                <InputOTP
                  ref={(element) => {
                    inputs.current[index] = element;
                    if (index === 0) inputRef(element);
                  }}
                  aria-label={`Bloco ${index + 1} de 11, quatro dígitos`}
                  maxLength={GROUP_SIZE}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="off"
                  pushPasswordManagerStrategy="none"
                  disabled={disabled}
                  value={group}
                  aria-invalid={!!message}
                  aria-describedby={`access-key-help access-key-progress${message ? ' access-key-error' : ''}`}
                  onChange={(text) => updateGroup(index, text)}
                  onBlur={onBlur}
                  onKeyDown={(event) => {
                    const input = event.currentTarget;
                    if (event.key === 'Backspace' && !group && index > 0) {
                      event.preventDefault();
                      focusGroup(index - 1);
                    } else if (event.key === 'ArrowLeft' && input.selectionStart === 0 && index > 0) {
                      event.preventDefault();
                      focusGroup(index - 1);
                    } else if (event.key === 'ArrowRight' && input.selectionStart === group.length && index < GROUP_COUNT - 1) {
                      event.preventDefault();
                      focusGroup(index + 1);
                    }
                  }}
                >
                  <InputOTPGroup>
                    {Array.from({ length: GROUP_SIZE }, (_, slot) => (
                      <InputOTPSlot key={slot} index={slot} aria-invalid={!!message} className="h-11 w-7 font-mono text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <p id="access-key-progress" role="status" className="text-sm text-muted-foreground">
        {digits.length === 44 ? '44 de 44 dígitos. Confira a chave e clique em Avançar.' : `${digits.length} de 44 dígitos`}
      </p>
      {message && <p id="access-key-error" role="alert" className="text-sm text-destructive">{message}</p>}
    </fieldset>
  );
}
