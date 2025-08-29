// services/menu-service.ts
import { callBackend } from '../utils/api-client';
import { PROTECTED_API_PATH } from '../api-config';

// Define tus funciones de servicio
export const getMenus = async () => {
    // callBackend se encargará de invocar el comando de Tauri o el endpoint web
    const response = await callBackend('get_all_menus_command', 
        {}, `${PROTECTED_API_PATH}/menus`, 'GET');
    return response;
};

