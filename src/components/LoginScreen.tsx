import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

function LoginScreen({ onLoginSuccess }: LoginScreenProps): JSX.Element {
  const [username, setUsername] = useState<string>(''); 
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleLogin = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage('');
    try {
      const success = await invoke<boolean>('user_login', { username, password });
      if (success) {
        onLoginSuccess();
      } else {
        setErrorMessage('Usuario o contraseña incorrectos.');
      }
    } catch (error: any) {
        console.error('Error en el login:', error);
        setErrorMessage(error.message || 'Error desconocido al intentar iniciar sesión.');
    } finally {
        setLoading(false);
    }
  };

  const handleExit = () => {
    // Cierra la ventana de la aplicación
    appWindow.close();
  };

  return (
    <div className="credential-screen-container">
      <div className="credential-form-card">
        <h2 className="credential-title">Iniciar Sesión</h2>
        <div className="p-8 bg-white rounded w-96">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Usuario</label>
            <input
              className="form-input"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              className="form-input"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {errorMessage && (
            <p className="form-error-message">{errorMessage}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
            <button
              className="form-button bg-blue-600 hover:bg-blue-700 w-full"
              type="button"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Iniciando...' : 'Entrar'}
            </button>
            <button
              className="form-button bg-gray-500 hover:bg-gray-600 w-full"
              type="button"
              onClick={handleExit}
              disabled={loading}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;