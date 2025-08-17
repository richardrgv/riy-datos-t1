import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { LicenseCheckResult } from '../types/license';

// Define los props que este componente recibirá
interface CredentialScreenProps {
    licenseCheckResult: LicenseCheckResult | null;
    onCredentialsLoaded: () => void;
}

const CredentialScreen = ({ licenseCheckResult, onCredentialsLoaded }: CredentialScreenProps) => {
    // Estados para el formulario y mensajes
    const [encryptedCredentials, setEncryptedCredentials] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [serverName, setServerName] = useState<string>('Cargando...');
    const [dbName, setDbName] = useState<string>('Cargando...');

    useEffect(() => {
        // Muestra el mensaje del backend cuando el componente se carga
        if (licenseCheckResult && licenseCheckResult.message) {
            setError(licenseCheckResult.message);
        }

        const fetchDbInfo = async () => {
            try {
                // Obtiene el nombre del servidor y la base de datos desde el backend
                const [fetchedServerName, fetchedDbName] = 
                    await invoke<[string, string]>('get_db_connection_info_command');
                setServerName(fetchedServerName);
                setDbName(fetchedDbName);
            } catch (err: any) {
                console.error('Error al obtener la información de la base de datos:', err);
                setError(err.message || 'No se pudo cargar la información de la base de datos.');
                setServerName('Error');
                setDbName('Error');
            }
        };

        fetchDbInfo();
    }, [licenseCheckResult]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');


        try {
            const licenseSavedAndValid = await invoke<boolean>('save_license_credentials_command', {
                encryptedCredentialsFromUser: encryptedCredentials,
            });

            if (licenseSavedAndValid) {
                onCredentialsLoaded();
            } else {
                setError('Error al guardar la credencial. Verifique los datos e intente de nuevo.');
            }
        } catch (e: any) {
            // --- CAMBIO CLAVE: Registrar el error completo para depuración ---
            console.error('Error del backend en save_license_credentials_command:', e);
            // Si el backend devuelve un `Err(...)`, el mensaje de error de Rust estará aquí
            setError(e.message || 'Error desconocido al guardar la credencial. Revise la consola del desarrollador para más detalles.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="credential-screen-container">
            <div className="credential-form-card">
                <h2 className="credential-title">Cargar Credenciales RIY Datos</h2>
                <form onSubmit={handleSubmit}>
                    {/* Campo: Servidor */}
                    <div className="form-group">
                        <label className="form-label">Servidor (obtenido de la conexión)</label>
                        <p className="form-read-only">{serverName}</p>
                    </div>

                    {/* Campo: Base de Datos */}
                    <div className="form-group">
                        <label className="form-label">Base de Datos (obtenida de la conexión)</label>
                        <p className="form-read-only">{dbName}</p>
                    </div>
                    
                                        
                    {/* Campo: Credenciales Encriptadas */}
                    <div className="form-group">
                        <label htmlFor="encryptedCredentials" className="form-label">Credenciales Encriptadas (RIYAPP)</label>
                        <textarea
                            id="encryptedCredentials"
                            className="form-textarea"
                            value={encryptedCredentials}
                            onChange={(e) => setEncryptedCredentials(e.target.value)}
                            required
                            placeholder="Ingrese las credenciales encriptadas aquí..."
                        />
                    </div>

                    {error && <p className="form-error-message">{error}</p>}

                    <button
                        type="submit"
                        className="form-button"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar Credenciales'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CredentialScreen;