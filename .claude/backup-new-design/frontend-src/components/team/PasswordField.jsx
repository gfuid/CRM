import { useState } from 'react';
import { Copy, Eye, EyeOff, WandSparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Button, IconButton, Input } from '../ui';
import { copyText, generatePassword } from './helpers';

/**
 * Password input with show/hide, a "Generate" button and an optional copy button.
 * Wrap it in <Field>: the id and aria-invalid that Field passes go to the input.
 */
export default function PasswordField({ value, onChange, id, 'aria-invalid': invalid, showCopy = false, autoComplete = 'new-password', ...rest }) {
  const [show, setShow] = useState(false);
  const toast = useToast();

  const generate = () => {
    onChange(generatePassword());
    setShow(true);
  };

  const copy = async () => {
    try {
      await copyText(value);
      toast.success('Password copied');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative min-w-0 flex-1">
        <Input
          id={id}
          aria-invalid={invalid}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="off"
          className="pr-10 font-mono tracking-wide"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-faint hover:text-ink"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <Button icon={WandSparkles} onClick={generate} className="h-10">
        Generate
      </Button>
      {showCopy && <IconButton icon={Copy} label="Copy password" variant="secondary" onClick={copy} disabled={!value} className="disabled:opacity-50" />}
    </div>
  );
}
