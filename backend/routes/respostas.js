const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Instanciar o cliente do Supabase
// Usando a chave anônima (ANON_KEY) pois a inserção é permitida para anônimos
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.post('/', async (req, res) => {
  try {
    const {
      casado,
      perfil_resultado,
      pontuacao_eixo1,
      pontuacao_eixo2,
      pontuacao_eixo3,
      respostas
    } = req.body;

    // Validação básica
    if (!perfil_resultado) {
      return res.status(400).json({ error: 'Perfil de resultado é obrigatório' });
    }

    const { data, error } = await supabase
      .from('diagnosticos')
      .insert([
        {
          casado,
          perfil_resultado,
          pontuacao_eixo1,
          pontuacao_eixo2,
          pontuacao_eixo3,
          respostas
        }
      ]);

    if (error) {
      console.error('Erro ao inserir no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao salvar o diagnóstico no banco de dados.' });
    }

    return res.status(201).json({ message: 'Diagnóstico salvo com sucesso!' });

  } catch (err) {
    console.error('Erro interno do servidor:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
