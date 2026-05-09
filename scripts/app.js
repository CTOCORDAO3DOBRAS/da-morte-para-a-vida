// STATE
  const state = {
    scores: { q1:0, q2:0, q3:0, q6:0, q7b:0, q8:0, q8b:0 },
    casado: null,
    textos: {}
  };

  function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToEixo2() {
    goTo('screen-2');
  }

  function selectBifur(tipo) {
    state.casado = (tipo === 'casado');
    document.querySelectorAll('.bifurcacao-btn').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');
    setTimeout(() => {
      goTo(tipo === 'casado' ? 'screen-3a' : 'screen-3b');
    }, 300);
  }

  function selectScale(btn, key) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.scores[key] = parseInt(btn.textContent);
  }

  function checkTermo() {
    const checked = document.getElementById('termo-aceite').checked;
    const btn = document.getElementById('btn-diagnostico');
    btn.disabled = !checked;
    btn.style.opacity = checked ? '1' : '0.4';
    btn.style.cursor = checked ? 'pointer' : 'not-allowed';
  }

  // PERFIS
  const perfis = {
    adormecido: {
      icon: '🌑',
      nome: 'O Adormecido',
      desc: 'Você vive no automático. Sabe que existe algo maior dentro de você, mas o medo e o conforto têm sido mais fortes. A boa notícia: o fato de você estar aqui, respondendo essas perguntas, já é o primeiro sinal de que algo está acordando.',
      passos: [
        'Faça a pergunta-âncora todos os dias ao acordar: "O que estou fazendo hoje me leva ao meu propósito?"',
        'Identifique uma pessoa de confiança para compartilhar o que você descobriu nesse diagnóstico.',
        'Leia o livro "Da Morte Para a Vida" e conheça histórias de pessoas que estiveram onde você está.',
        'Comece um diário de gratidão — 3 coisas por dia. Isso recalibra a perspectiva.'
      ]
    },
    desperto: {
      icon: '🌅',
      nome: 'O Desperto',
      desc: 'Você já teve o seu momento de ruptura — uma perda, uma crise, uma madrugada que mudou tudo. Você sabe que precisa mudar, mas ainda busca clareza de direção. Você está entre o casulo e o voo, e essa é a posição mais corajosa de todas.',
      passos: [
        'Documente seu momento de ruptura por escrito. Essa memória é sua bússola nos dias difíceis.',
        'Nos próximos 30 dias, reserve 30 minutos diários com O PAPAI — antes do celular, antes do trabalho.',
        'Identifique uma associação desalinhada na sua vida que precisa de um rompimento pacífico.',
        'Conecte-se com a comunidade Da Morte Para a Vida para encontrar outros Despertos na jornada.'
      ]
    },
    caminhante: {
      icon: '🚶',
      nome: 'O Caminhante',
      desc: 'Você já tem direção e propósito identificados. A luta agora é de consistência — manter o alinhamento nos três eixos quando a pressão das circunstâncias aumenta. Você sabe quem é. Agora é sobre ser isso todos os dias.',
      passos: [
        'Implemente o Cronograma do Reino: Segunda (visão de legado), Quarta (filtro ético), Sexta (auditoria relacional).',
        'Crie um ritual semanal de Shabbat — um dia sem trabalho, dedicado ao descanso e à família.',
        'Encontre um Edificador como mentor. Quem está na frente encurta seu caminho.',
        'Comprometa-se com uma área de serviço — igrejas, comunidades, projetos sociais. O propósito se fortalece no serviço.'
      ]
    },
    edificador: {
      icon: '🏛️',
      nome: 'O Edificador',
      desc: 'Você vive alinhado nos três eixos. Não é perfeito — é intencional. Você constrói legado, multiplica o que recebeu e caminha como Abrão depois da separação de Ló: com clareza profética e propósito inabalável. Agora sua missão é multiplicar.',
      passos: [
        'Documente sua história completa e considere fazer parte das 50 entrevistas do projeto Da Morte Para a Vida.',
        'Identifique pelo menos um Adormecido e um Desperto ao seu redor para investir intencionalmente.',
        'Estruture seu legado: trusts, políticas de governança familiar, ou projetos filantrópicos alinhados com seu propósito.',
        'Junte-se à comunidade fechada dos Edificadores — líderes que constroem juntos o que nenhum constrói sozinho.'
      ]
    }
  };

  async function gerarDiagnostico() {
    // Desabilitar o botão e mostrar carregamento
    const btn = document.getElementById('btn-diagnostico');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Processando...';

    // Coletar textos
    const idsTextos = ['q4', 'q5', 'q7', 'q9', 'q10', 'q6b', 'q8b', 'q11', 'q12', 'q13', 'q14', 'q15'];
    idsTextos.forEach(id => {
      const el = document.getElementById(id);
      if (el) state.textos[id] = el.value.trim();
    });

    // Calcular scores
    const e1 = (state.scores.q1 + state.scores.q2 + state.scores.q3) / 3;
    const e2 = state.casado
      ? (state.scores.q6 + state.scores.q8) / 2
      : (state.scores.q7b) || 3;
    const e3 = 3; // textos livres — score neutro base
    const total = (e1 + e2 + e3) / 3;

    // Definir perfil
    let perfil;
    if (total < 2) perfil = perfis.adormecido;
    else if (total < 3) perfil = perfis.desperto;
    else if (total < 4.2) perfil = perfis.caminhante;
    else perfil = perfis.edificador;

    // Enviar dados para o Backend
    const payload = {
      casado: state.casado,
      perfil_resultado: perfil.nome,
      pontuacao_eixo1: Math.round(e1 * 20),
      pontuacao_eixo2: Math.round(e2 * 20),
      pontuacao_eixo3: 60, // base
      respostas: {
        escalas: state.scores,
        textos: state.textos
      }
    };

    try {
      // Offline-first: tenta enviar para a API. Se falhar, segue o fluxo para não bloquear o usuário.
      const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                  ? 'http://localhost:3000/api/diagnostico' 
                  : '/api/diagnostico';
      
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Erro ao salvar diagnóstico (pode estar offline). Continuando fluxo.', err);
    }

    // Preencher resultado visual
    document.getElementById('result-icon').textContent = perfil.icon;
    document.getElementById('result-nome').textContent = perfil.nome;
    document.getElementById('result-desc').textContent = perfil.desc;

    // Scores visuais
    const s1 = payload.pontuacao_eixo1;
    const s2 = payload.pontuacao_eixo2;
    const s3 = payload.pontuacao_eixo3;
    document.getElementById('score-1').style.width = s1 + '%';
    document.getElementById('score-1-num').textContent = s1 + '%';
    document.getElementById('score-2').style.width = s2 + '%';
    document.getElementById('score-2-num').textContent = s2 + '%';
    document.getElementById('score-3').style.width = s3 + '%';
    document.getElementById('score-3-num').textContent = s3 + '%';

    // Passos
    const lista = document.getElementById('passos-lista');
    lista.innerHTML = '';
    perfil.passos.forEach((p, i) => {
      lista.innerHTML += `
        <div class="passo">
          <div class="passo-num">${i+1}</div>
          <p class="passo-texto">${p}</p>
        </div>
      `;
    });

    // Restaurar botão e ir para a tela de resultado
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
    goTo('screen-6');
  }

  function compartilhar() {
    const texto = `Acabei de descobrir meu perfil no diagnóstico "Da Morte Para a Vida" da Cordão de 3 Dobras Editora. Você também deveria fazer o seu. 🙏`;
    if (navigator.share) {
      navigator.share({ title: 'Da Morte Para a Vida', text: texto });
    } else {
      navigator.clipboard.writeText(texto).then(() => alert('Texto copiado! Cole onde quiser compartilhar.'));
    }
  }

  function reiniciar() {
    Object.keys(state.scores).forEach(k => state.scores[k] = 0);
    state.casado = null;
    state.textos = {};
    document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.q-textarea').forEach(t => t.value = '');
    document.querySelectorAll('.bifurcacao-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('termo-aceite').checked = false;
    checkTermo();
    goTo('screen-0');
  }