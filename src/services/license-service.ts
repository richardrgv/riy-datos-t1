// api-service.ts
import { callBackend} from '../utils/api-client'; // Importa la nueva función
import { LicenseCheckResult } from '../types/license';
import { PUBLIC_API_PATH } from '../api-config';

// Define tus funciones de servicio

export const checkLicenseStatus = async (): Promise<LicenseCheckResult> => {
    return await callBackend('check_license_status_command', {}, `${PUBLIC_API_PATH}/license/status`, 'GET');
};

