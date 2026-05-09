const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Instanciar o cliente do Supabase
// Para o dashboard, precisamos da chave de serviço (SERVICE_KEY) para ler a tabela 
// ignorando as regras de RLS (que bloqueiam a leitura para anônimos).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware de Autenticação via API Key
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Acesso negado. Chave da API inválida ou ausente.' });
  }
  next();
};

router.get('/metricas', requireApiKey, async (req, res) => {
  try {
    // Buscar todos os diagnósticos para gerar as métricas
    // Em produção com muitos dados, o ideal é fazer a agregação no próprio banco ou paginar
    const { data, error } = await supabase
      .from('diagnosticos')
      .select('created_at, casado, perfil_resultado, pontuacao_eixo1, pontuacao_eixo2, pontuacao_eixo3, respostas');

    if (error) {
      console.error('Erro ao buscar dados do Supabase:', error);
      return res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
    }

    // Processar métricas agregadas
    const total = data.length;
    
    const perfis = {
      'O Adormecido': 0,
      'O Desperto': 0,
      'O Caminhante': 0,
      'O Edificador': 0
    };

    let casados = 0;
    let solteiros = 0;

    data.forEach(item => {
      if (perfis[item.perfil_resultado] !== undefined) {
        perfis[item.perfil_resultado]++;
      }
      if (item.casado === true) casados++;
      if (item.casado === false) solteiros++;
    });

    return res.status(200).json({
      total,
      perfis,
      demografia: {
        casados,
        solteiros
      },
      // Retorna os dados completos para desenhar os gráficos (tabelas, listagem de textos abertos, etc.)
      raw: data 
    });

  } catch (err) {
    console.error('Erro no dashboard:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
