// src/components/DataForm.tsx
/*
2025-08-08  RichardG  componente reutilizable y agnóstico a la lógica de negocio, 
                      ya que solo sabe cómo renderizar un campo de selección 
                      si se le proporciona la información necesaria.
*/
import React, { useState, useEffect } from 'react';
import './DataForm.css';

interface DataFormProps<T> {
  // Ahora solo pasas los campos, el título y la función de guardado
  fields: { name: keyof T; label: string; type: string; disabled: boolean }[];
  title: string;
  initialData?: T;
  onSave: (data: T) => Promise<any>; // <-- onSave es una prop abstracta
  onClose: () => void;
}

function DataForm<T>({ fields, title, initialData, onSave, onClose }: DataFormProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>(initialData || {});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Unificamos la lógica de guardado y manejo de errores aquí
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null); // Limpiar cualquier error anterior

    try {
      await onSave(formData as T); // <-- Simplemente llama a la función `onSave` que se le pasó
      onClose();
    } catch (e) {
      console.error("Error capturado en DataForm:", e);
      if (typeof e === 'string') {
        setLocalError(e);
      } else {
        setLocalError("Ocurrió un error inesperado.");
      }
    }
    try {
      await onSave(formData as T);
      onClose();
    } catch (e) {
      console.error("Error capturado en DataForm:", e);
      if (typeof e === 'string') {
        setLocalError(e);
      } else {
        setLocalError("Ocurrió un error inesperado.");
      }
    }
  };

  // NUEVA Lógica: verificar si hay al menos un campo editable
  const isEditable = fields.some(field => !field.disabled);
  
  return (
    <div className="modal-backdrop">
      <div className="data-form-card">
        <h2>{title}</h2>
        <form onSubmit={handleFormSubmit}>
          {localError && <div className="error-message">{localError}</div>}
          {fields.map((field) => (
            <div className="form-field" key={field.name as string}>
              <label htmlFor={field.name as string}>{field.label}:</label>

              {field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name as string}
                  value={formData[field.name as keyof T] as string}
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
             {isEditable && <button type="submit">Guardar</button>}
            <button type="button" onClick={onClose}>Cerrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DataForm;