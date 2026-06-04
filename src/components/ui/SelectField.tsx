"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[] | string[];
  size?: "lg" | "md";
  required?: boolean;
  placeholder?: string;
  error?: string | null;
  help?: ReactNode;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Dropdown propio estilo "Typeform" (reemplaza al <select> nativo): mismo label
 * en mayúsculas arriba, línea inferior con barra de acento al enfocar, y un menú
 * custom (sin la caja gris del navegador). Accesible con teclado y click-fuera.
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  size = "lg",
  required,
  placeholder = "Selecciona…",
  error,
  help,
  id,
  name,
  disabled,
  className,
  style,
}: Props) {
  const opts: SelectOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const autoId = useId();
  const fieldId = id || `sf-${autoId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, opts.findIndex((o) => o.value === value)));

  const selected = opts.find((o) => o.value === value) || null;
  const err = error != null ? error : touched && required && !value ? "Selecciona una opción." : null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTouched(true);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setTouched(true);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(opts.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const o = opts[activeIdx];
        if (o) {
          onChange(o.value);
          setOpen(false);
          setTouched(true);
        }
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, activeIdx, opts, onChange]);

  return (
    <div
      ref={rootRef}
      className={`tf tf-${size} tf-has-adorn${err ? " tf-error" : ""}${disabled ? " tf-disabled" : ""}${
        className ? ` ${className}` : ""
      }`}
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
        <button
          type="button"
          id={fieldId}
          name={name}
          className="tf-input tf-select-btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={err ? true : undefined}
          disabled={disabled}
          onClick={() => {
            setOpen((o) => !o);
            setTouched(true);
          }}
          onBlur={() => setTouched(true)}
        >
          <span className={selected ? undefined : "tf-select-ph"}>
            {selected ? selected.label : placeholder}
          </span>
        </button>

        <span className="tf-line" aria-hidden="true" />
        <span className={`tf-adorn tf-select-chevron${open ? " is-open" : ""}`} aria-hidden="true">
          <ChevronDown size={18} />
        </span>

        {open && (
          <ul className="tf-select-menu" role="listbox" aria-label={label}>
            {opts.map((o, i) => {
              const sel = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={sel}
                  className={`tf-select-opt${sel ? " is-sel" : ""}${i === activeIdx ? " is-active" : ""}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setTouched(true);
                  }}
                >
                  <span>{o.label}</span>
                  {sel && <Check size={15} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {err ? (
        <div className="tf-error-msg" role="alert">
          {err}
        </div>
      ) : help ? (
        <div className="tf-help">{help}</div>
      ) : null}
    </div>
  );
}
