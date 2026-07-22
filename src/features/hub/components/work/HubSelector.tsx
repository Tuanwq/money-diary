import { Check } from "lucide-react";
import { HUB_TYPE_LABEL, HUB_TYPES } from "../../../../constants/hanoiHub";
import type { HubType } from "../../../../types/hub";

type HubSelectorProps = {
  value: HubType;
  onChange: (hubType: HubType) => void;
};

export function HubSelector({ value, onChange }: HubSelectorProps) {
  return (
    <fieldset className="hub-selector">
      <legend>Loại Hub</legend>
      <div className="hub-selector__options">
        {HUB_TYPES.map((hubType) => {
          const selected = value === hubType;

          return (
            <label
              key={hubType}
              className={`hub-selector__option${selected ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="hub-type"
                value={hubType}
                checked={selected}
                onChange={() => onChange(hubType)}
              />
              <span>{HUB_TYPE_LABEL[hubType]}</span>
              {selected && <Check size={16} aria-hidden="true" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
