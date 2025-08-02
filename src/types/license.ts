// src/types/license.ts

// Exporta el enum con los mismos nombres de variantes
export enum LicenseStatus {
    Valid = 'Valid',
    Expired = 'Expired',
    NotFound = 'NotFound',
    InvalidHash = 'InvalidHash',
    Corrupted = 'Corrupted'
}

// Exporta la interfaz para la estructura
export interface LicenseCheckResult {
    status: LicenseStatus;
    message: string;
}