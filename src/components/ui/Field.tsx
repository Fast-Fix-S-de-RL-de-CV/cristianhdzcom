"use client";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import {
  applyFormat,
  formatError,
  hasValidity,
  inputModeFor,
  isValidEmail,
  type FieldFormat,
} from "@/lib/format";

type Props = {
  label: string;
  value: string;
  /** Recibe el valor YA normalizado según `format`. */
  onChange: (value: string) => void;
  /** Tipo de normalización/validación. Default "text". */
  format?: FieldFormat;
  /** Tamaño del texto que se escribe: "lg" (~20px, páginas) | "md" (~16px, modales). */
  size?: "lg" | "md";
  placeholder?: string;
  required?: boolean;
  /** Error externo (gana sobre la validación interna). null/undefined = sin error. */
  error?: string | null;
  /** Texto de ayuda bajo el campo (si no hay error). */
  help?: ReactNode;
  /** textarea en vez de input. */
  multiline?: boolean;
  rows?: number;
  /** Forzar mostrar/ocultar el ✓ de válido. Por defecto se infiere del formato. */
  showValid?: boolean;
  name?: string;
  id?: string;
  autoComplete?: string;
  disabled?: boolean;
  maxLength?: number;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  style?: CSSProperties;
  autoFocus?: boolean;
};

/**
 * Input unificado estilo "Typeform": label en mayúsculas arriba, sin caja (solo
 * línea inferior), barra de acento que crece al enfocar, caret de acento, texto
 * grande. Normaliza al escribir según `format` y muestra error específico.
 *
 * Mantiene la API value + onChange habitual: <Field value={x} onChange={setX} />.
 */
export function Field({
  label,
  value,
  onChange,
  format = "text",
  size = "lg",
  placeholder,
  required,
  error,
  help,
  multiline,
  rows = 3,
  showValid,
  name,
  id,
  autoComplete,
  disabled,
  maxLength,
  onBlur,
  onKeyDown,
  className,
  style,
  autoFocus,
}: Props) {
  const autoId = useId();
  const fieldId = id || `tf-${autoId}`;
  const [touched, setTouched] = useState(false);
  const [show, setShow] = useState(false);

  const isPassword = format === "password";
  const builtinError = touched ? formatError(format, value, !!required) : null;
  const err = error != null ? error : builtinError;

  const validNow =
    !err &&
    value.trim().length > 0 &&
    (format !== "email" || isValidEmail(value));
  const showCheck = (showValid ?? hasValidity(format)) && touched && validNow && !isPassword;
  const hasAdorn = isPassword || showCheck;

  const type = isPassword ? (show ? "text" : "password") : format === "email" ? "email" : "text";
  const errId = err ? `${fieldId}-err` : undefined;

  function handleChange(raw: string) {
    onChange(applyFormat(format, raw));
  }
  function handleBlur() {
    setTouched(true);
    onBlur?.();
  }

  const sharedProps = {
    id: fieldId,
    name,
    value,
    placeholder,
    disabled,
    maxLength,
    autoComplete,
    "aria-invalid": err ? true : undefined,
    "aria-describedby": errId,
    "aria-required": required || undefined,
    className: "tf-input",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onBlur: handleBlur,
    onKeyDown,
    autoFocus,
  } as const;

  return (
    <div
      className={`tf tf-${size}${err ? " tf-error" : ""}${disabled ? " tf-disabled" : ""}${
        hasAdorn ? " tf-has-adorn" : ""
      }${className ? ` ${className}` : ""}`}
      style={style}
    >
      <label htmlFor={fieldId} className="tf-label">
        {label}
        {required && (
          <span className="tf-req" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="tf-control">
        {multiline ? (
          <textarea {...sharedProps} rows={rows} />
        ) : (
          <input {...sharedProps} type={type} inputMode={inputModeFor(format)} spellCheck={format === "email" ? false : undefined} autoCapitalize={format === "email" ? "off" : undefined} />
        )}

        <span className="tf-line" aria-hidden="true" />

        {isPassword ? (
          <button
            type="button"
            className="tf-adorn"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : showCheck ? (
          <span className="tf-adorn tf-check" aria-hidden="true">
            <Check size={18} />
          </span>
        ) : null}
      </div>

      {err ? (
        <div className="tf-error-msg" id={errId} role="alert">
          {err}
        </div>
      ) : help ? (
        <div className="tf-help">{help}</div>
      ) : null}
    </div>
  );
}
