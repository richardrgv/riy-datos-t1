// api-service.ts
import { callBackend} from '../utils/api-client'; // Importa la nueva función
import { LicenseCheckResult } from '../types/license';
import { PUBLIC_API_PATH } from '../api-config';

// Define tus funciones de servicio


// Define tus funciones de servicio
export const getDbConnectionInfo = async (): Promise<[string, string]> => {
    return await callBackend(
        'get_db_connection_info_command', 
        {}, 
        `${PUBLIC_API_PATH}/license/db-info`, 
        'GET'
    );
};

export const saveLicenseCredentials = async (encryptedCredentials: string) => {
    // ⭐ CAMBIO CLAVE: Aquí construimos el objeto JSON con el nombre de campo correcto.
    const payload = { credentials: encryptedCredentials };
    return await callBackend(
        'save_license_credentials_command', 
        payload, // ⭐ PASA EL STRING DIRECTAMENTE
        `${PUBLIC_API_PATH}/license/save-credentials`, 
        'POST'
    );
};

export const checkLicenseStatus = async (): Promise<LicenseCheckResult> => {
    return await callBackend(
        'check_license_status_command', 
        {}, 
        `${PUBLIC_API_PATH}/license/status`, 
        'GET'
    );
};