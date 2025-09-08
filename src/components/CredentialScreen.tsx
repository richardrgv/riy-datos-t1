// src/components/CredentialScreen.tsx
import React, { useState, useEffect } from 'react';
// ⭐ Importamos las funciones del servicio, no 'invoke' ⭐
import { getDbConnectionInfo, saveLicenseCredentials } from '../services/license-service';
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
        if (licenseCheckResult && licenseCheckResult.message) {
            setError(licenseCheckResult.message);
        }

        const fetchDbInfo = async () => {
            try {
                // ⭐ Usamos la función del servicio en lugar de 'invoke' ⭐
                const [fetchedServerName, fetchedDbName] = await getDbConnectionInfo();
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
            // ⭐ CAMBIO CLAVE: Pasa la cadena de texto directamente a la función de servicio.
            const result = await saveLicenseCredentials(encryptedCredentials);

            if (result) {
                onCredentialsLoaded();
            } else {
                setError('Error al guardar la credencial. Verifique los datos e intente de nuevo.');
            }
        } catch (e: any) {
            console.error('Error del backend en save_license_credentials_command:', e);
            setError(e.message || 'Error desconocido al guardar la credencial. Revise la consola del desarrollador para más detalles.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEncryptedCredentials(e.target.value);
    };

    return (<div className="credential-screen-container">
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
                        onChange={handleChange}
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