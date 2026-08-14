import React, { createContext, useContext, useState, useEffect } from 'react';
import styles from './UIContext.module.css';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { message, onConfirm }

  // Eliminar el toast después de 3s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message) => {
    setToast(message);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmState({ message, onConfirm });
  };

  const handleConfirm = () => {
    if (confirmState?.onConfirm) {
      confirmState.onConfirm();
    }
    setConfirmState(null);
  };

  const handleCancel = () => {
    setConfirmState(null);
  };

  return (
    <UIContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast */}
      {toast && (
        <div className={styles.toastContainer}>
          <div className={styles.toast}>
            {toast}
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {confirmState && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirmación</h3>
            <p className={styles.modalMessage}>{confirmState.message}</p>
            <div className={styles.modalButtons}>
              <button className={styles.btnCancel} onClick={handleCancel}>Cancelar</button>
              <button className={styles.btnConfirm} onClick={handleConfirm}>Sí, quitar</button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};
