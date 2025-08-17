// src/components/DataForm.tsx
/*
2025-08-08  RichardG  componente reutilizable y agnóstico a la lógica de negocio, 
                      ya que solo sabe cómo renderizar un campo de selección 
                      si se le proporciona la información necesaria.
2025-08-15  RichardG  No maneje errores sea flexible y generico
*/

// src/components/DataForm.tsx
import React, { useState } from 'react';
import './DataForm.css';

interface DataFormProps<T> {
  fields: { name: keyof T; label: string; type: string; disabled: boolean; options?: { value: string; label: string }[] }[];
  title: string;
  // Ya no usamos initialData. formData es la fuente de verdad.
  formData: Partial<T>; 
  setFormData: React.Dispatch<React.SetStateAction<Partial<T>>>; 
  onSave: (data: Partial<T>) => Promise<void>;
  onClose: () => void;
  apiError?: string;
  onClearError: () => void;
}

function DataForm<T>({ fields, title, formData, setFormData, onSave, onClose, apiError, onClearError }: DataFormProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    onClearError();
    await onSave(formData);
    setIsLoading(false);
  };

  const isEditable = fields.some(field => !field.disabled);

  return (
    <div className="modal-backdrop">
      <div className="data-form-card">
        <h2>{title}</h2>
        <form onSubmit={handleFormSubmit}>
          {apiError && <div className="error-message">{apiError}</div>}
          
          {fields.map((field) => (
            <div className="form-field" key={field.name as string}>
              <label htmlFor={field.name as string}>{field.label}:</label>

              {field.type === 'select' ? (
                <select
                  id={field.name as string}
                  name={field.name as string}
                  value={(formData as any)[field.name as keyof T] as string || ''}
                  onChange={handleInputChange}
                  disabled={field.disabled}
                >
                  {field.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name as string}
                  value={(formData as any)[field.name]?.toString() || ''}
                  onChange={handleInputChange}
                  disabled={field.disabled}
                />
              )}
            </div>
          ))}

          <div className="form-actions">
            {isEditable && (
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </button>
            )}
            <button type="button" onClick={onClose}>Cerrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DataForm;