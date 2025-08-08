import React from 'react';
import './DetailsModal.css'; // Asegúrate de crear este archivo

interface DetailsModalProps<T extends object> {
  title: string;
  data: T;
  onClose: () => void;
}

function DetailsModal<T extends object>({ title, data, onClose }: DetailsModalProps<T>) {
  return (
    <div className="modal-backdrop">
      <div className="details-modal-card">
        <div className="details-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-button">X</button>
        </div>
        <div className="details-modal-body">
          {Object.entries(data).map(([key, value]) => (
            <div className="details-item" key={key}>
              <span className="details-label">{key.replace(/_/g, ' ')}:</span>
              <span className="details-value">{value ? String(value) : 'N/A'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DetailsModal;