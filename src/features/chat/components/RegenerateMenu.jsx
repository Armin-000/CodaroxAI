import { Check, ChevronDown, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MODEL_OPTIONS,
  getModelOption,
  modelSupportsVision,
  resolveRuntimeModelChoice,
} from "../../models/modelCatalog.js";

export function RegenerateMenu({ app, message }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const capability = app.getRetryCapability(message.id);

  const sameModelChoice = useMemo(
    () => resolveRuntimeModelChoice(message.model),
    [message.model]
  );

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const disabled = app.streaming || !capability.available;
  const tooltip = capability.available
    ? "Regenerate"
    : capability.reason || "This response cannot be regenerated.";

  function optionDisabled(value) {
    return capability.requiresVision && !modelSupportsVision(value);
  }

  function regenerate(modelOverride = "") {
    if (disabled) return;
    setOpen(false);
    app.retryMessage(message.id, { modelOverride });
  }

  return (
    <div className="regenerate-control" ref={rootRef}>
      <button
        type="button"
        onClick={() => regenerate("")}
        aria-label="Regenerate response"
        data-tooltip={tooltip}
        disabled={disabled}
      >
        <RefreshCw size={15} />
      </button>

      <button
        type="button"
        className="regenerate-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-label="Regenerate with another model"
        aria-expanded={open}
        data-tooltip={capability.available ? "Choose model" : tooltip}
        disabled={disabled}
      >
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="regenerate-model-popover" role="menu">
          <div className="regenerate-model-title">Regenerate with</div>

          <button
            type="button"
            role="menuitem"
            className="regenerate-model-option"
            disabled={!sameModelChoice || optionDisabled(sameModelChoice)}
            onClick={() => regenerate(sameModelChoice || "")}
          >
            <span>
              <strong>Same model</strong>
              <small>
                {sameModelChoice
                  ? getModelOption(sameModelChoice).label
                  : "Unavailable for this response"}
              </small>
            </span>
          </button>

          <div className="regenerate-model-divider" />

          {MODEL_OPTIONS.map((model) => {
            const isDisabled = optionDisabled(model.value);
            const selected = model.value === (app.settings.model || "auto");

            return (
              <button
                key={model.value}
                type="button"
                role="menuitem"
                className="regenerate-model-option"
                disabled={isDisabled}
                onClick={() => regenerate(model.value)}
                title={isDisabled ? "This model cannot replay image inputs." : undefined}
              >
                <span>
                  <strong>{model.label}</strong>
                  <small>{isDisabled ? "Text only" : model.provider}</small>
                </span>
                {selected && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
