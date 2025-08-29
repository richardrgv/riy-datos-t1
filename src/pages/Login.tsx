// src/components/LoginScreen.tsx
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import { useState } from 'react';
import { userLogin } from '../utils/api-service';
import { appWindow } from '@tauri-apps/api/window';
import { useUser } from '../contexts/UserContext'; // <-- Tu hook personalizado
import './Login.css';

/* Las props de este componente ya no serán necesarias
interface LoginScreenProps {
  onLoginSuccess: () => void;
} */

//
function Login(): JSX.Element {
  // Ahora, en lugar de setUser, necesitas la función de login del contexto que maneja todo.
  // Tu hook 'useUser' debe proveer esta función.
  const { login } = useUser();
  const navigate = useNavigate(); // Usa el hook useNavigate

  const [credentials, setCredentials] = useState({ usuario: '', password: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Llama a la API a través del servicio.
      // El servicio ya maneja el token internamente.
      const { user, permissions } = await userLogin(credentials);

      // 2. Si la llamada es exitosa, el contexto se actualiza.
      login(user, permissions);

      // 3. Llama a la función de éxito para cambiar la vista.
      // onLoginSuccess(); (ya no)
      // 3. Usar el hook useNavigate de React Router: 
      //    Esto te permite redirigir al usuario programáticamente 
      //    después de un inicio de sesión exitoso.
      // ⭐ Redirige a la página principal después de un login exitoso
      navigate('/');

    } catch (error: any) { // <-- Add the catch block here
      console.error('Error en el login:', error);
      setErrorMessage(error.message || 'Error desconocido al intentar iniciar sesión.');
    } finally { // <-- Add the finally block here
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
            <label className="form-label" htmlFor="usuario">Usuario</label>
            <input
              className="form-input"
              id="usuario"
              type="text"
              name="usuario" // Asegúrate de que los campos tengan un nombre
              value={credentials.usuario}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              className="form-input"
              id="password"
              type="password"
              name="password" // Asegúrate de que los campos tengan un nombre
              value={credentials.password}
              onChange={handleInputChange}
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

export default Login;