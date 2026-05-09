const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Importar Rotas
const respostasRoutes = require('./routes/respostas');
const dashboardRoutes = require('./routes/dashboard');
const qrcodeRoutes = require('./routes/qrcode');

// Montar Rotas
app.use('/api/diagnostico', respostasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/qrcode', qrcodeRoutes);

// Rota raiz da API (Health Check)
app.get('/api', (req, res) => {
  res.json({ message: 'API Da Morte Para a Vida rodando com sucesso!' });
});

// Para deploy serverless na Vercel
module.exports = app;

// Para rodar localmente
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
