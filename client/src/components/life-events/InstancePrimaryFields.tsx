import {
  LifeEventFloatingTextField,
} from './LifeEventFloatingField'

export interface InstanceLabelInputProps {
  instanceNumber: number
  id: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function InstanceLabelInput({
  instanceNumber,
  id,
  value,
  placeholder,
  onChange,
}: InstanceLabelInputProps) {
  return (
    <div className="life-events-instance-primary__label-group life-events-instance-primary__field life-events-instance-primary__field--label">
      <span className="life-events-instance-primary__index-badge" aria-hidden>
        {instanceNumber}
      </span>
      <LifeEventFloatingTextField
        id={id}
        label="Label"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="life-events-instance-primary__label-field"
      />
    </div>
  )
}

export function formatInstanceRowLabel(instanceNumber: number, label: string): string {
  const text = label.trim()
  return text ? `${instanceNumber}. ${text}` : `${instanceNumber}.`
}
