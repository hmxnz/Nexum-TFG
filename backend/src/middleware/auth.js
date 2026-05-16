// Middleware de autenticación y control de roles
// Esto funciona, no tocar

const jwt = require('jsonwebtoken');

// Comprueba que el token JWT sea válido y lo adjunta a req.usuario
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
  }

  // El token llega como "Bearer <token>"
  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token incorrecto, usar: Bearer <token>' });
  }

  const token = partes[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('[AUTH] jwt.verify falló:', error.name, '-', error.message);
    console.error('[AUTH] JWT_SECRET definido:', !!process.env.JWT_SECRET, '| longitud:', process.env.JWT_SECRET?.length);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token ha expirado, vuelve a iniciar sesión' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// Solo deja pasar a administradores
function soloAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
}

// Deja pasar a admin y consultor (cualquier usuario logueado válido)
function adminOConsultor(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const rolesValidos = ['admin', 'consultor'];
  if (!rolesValidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Rol de usuario no reconocido' });
  }
  next();
}

module.exports = { verificarToken, soloAdmin, adminOConsultor };
