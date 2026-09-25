import { MODEL_OPTIONS } from "../modelCatalog.js";

export function ModelPicker({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div className="composer-model-picker">
      <select
        value={value || "auto"}
        disabled={disabled}
        aria-label="AI model"
        title="Choose AI model"
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {MODEL_OPTIONS.map((model) => (
          <option
            key={model.value}
            value={model.value}
          >
            {model.shortLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
