// src/components/LoginScreen.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { useUser, LoggedInUser } from '../contexts/UserContext';
import './LoginScreen.css';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

function LoginScreen({ onLoginSuccess }: LoginScreenProps): JSX.Element {
  const { setUser } = useUser();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleLogin = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage('');

    try {
      // El comando de Rust ahora devuelve un objeto de usuario o null
      const result = await invoke<LoggedInUser | null>('user_login', { username, password });

      if (result) {
        // Si el login fue exitoso, guardamos el usuario en el contexto
        setUser(result);
        onLoginSuccess(); // Y navegamos a la siguiente pantalla
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
    appWindow.close();
  };

  return (
    <div className="login-screen-container">
      <div className="login-form-card">
        <h2 className="login-title">Iniciar Sesión</h2>
        <div className="form-content">
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
          <div className="form-button-group">
            <button
              className="form-button primary"
              type="button"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Iniciando...' : 'Entrar'}
            </button>
            <button
              className="form-button secondary"
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