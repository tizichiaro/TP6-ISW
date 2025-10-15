// Auth mock: autenticación simple con contraseña fija 'secret'
const users = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', password: 'secret' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', password: 'secret' }
];

export const login = (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email y password son obligatorios' });

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  // Mock: devolvemos user sin password
  const { password: _pw, ...safe } = user;
  res.json({ user: safe, token: 'mock-token-' + user.id });
};
