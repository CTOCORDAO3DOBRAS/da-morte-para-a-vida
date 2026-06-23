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

  function getShareText() {
    const perfil = document.getElementById('result-nome').textContent;
    return `🙏 Acabei de descobrir que meu perfil é "${perfil}" no diagnóstico "Da Morte Para a Vida".\n\nEsse diagnóstico me fez perguntas que ninguém nunca tinha me feito — sobre meu relacionamento com O PAPAI, com meu cônjuge e sobre o meu verdadeiro propósito de vida.\n\nNão é sobre dinheiro ou posses. É sobre como e para quê você vive.\n\n"Ainda há tempo para mim e para você."\n— Daniel de Mattos\n\n👉 Faça o seu diagnóstico gratuito:\nhttps://damorteparaavida.cordao3dobras.com\n\n#DaMortePAraAVida #Proposito #CordaoDe3Dobras`;
  }

  function compartilhar() {
    const texto = getShareText();
    
    if (navigator.share) {
      navigator.share({ 
        title: 'Da Morte Para a Vida — Meu Diagnóstico', 
        text: texto,
        url: 'https://damorteparaavida.cordao3dobras.com'
      });
    } else {
      navigator.clipboard.writeText(texto).then(() => alert('Texto copiado! Cole onde quiser compartilhar.'));
    }
  }

  function compartilharWhatsApp() {
    const texto = getShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  function compartilharEmail() {
    const texto = getShareText();
    const subject = 'Da Morte Para a Vida — Meu Diagnóstico';
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(texto)}`;
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

  async function baixarPDF() {
    // Pegar as referências das bibliotecas
    const { jsPDF } = window.jspdf;
    
    // Criar um container temporário para renderizar o PDF
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#0d1b2e';
    container.style.color = '#f5f0e8';
    container.style.padding = '60px';
    container.style.fontFamily = "'Montserrat', sans-serif";
    container.style.boxSizing = 'border-box';
    
    // Obter os dados da tela
    const nome = document.getElementById('result-nome').textContent;
    const icon = document.getElementById('result-icon').textContent;
    const desc = document.getElementById('result-desc').textContent;
    
    const s1 = document.getElementById('score-1').style.width;
    const s2 = document.getElementById('score-2').style.width;
    const s3 = document.getElementById('score-3').style.width;
    
    const passosHTML = document.getElementById('passos-lista').innerHTML;

    // Montar o HTML do PDF com a identidade visual
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 36px; color: #c9a84c; margin: 0;">Da Morte Para a Vida</h1>
        <p style="font-size: 14px; color: rgba(201,168,76,0.8); margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">Cordão de 3 Dobras Editora</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 40px; padding: 40px; background: rgba(201, 168, 76, 0.05); border: 1px solid rgba(201, 168, 76, 0.2); border-radius: 12px;">
        <div style="font-size: 70px; margin-bottom: 15px;">${icon}</div>
        <p style="font-size: 14px; color: #c9a84c; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Seu perfil é</p>
        <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 48px; color: #f5f0e8; margin: 0 0 20px 0;">${nome}</h2>
        <p style="font-size: 18px; line-height: 1.6; color: rgba(245,240,232,0.9); margin: 0;">${desc}</p>
      </div>

      <div style="margin-bottom: 40px; padding: 0 20px;">
        <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #c9a84c; margin-bottom: 25px; text-align: center;">Seu Alinhamento</h3>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 16px; font-weight: 500;">O Papai</span>
            <span style="font-size: 16px; color: #c9a84c; font-weight: bold;">${s1}</span>
          </div>
          <div style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; width: ${s1}; background: #c9a84c;"></div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 16px; font-weight: 500;">Aliança</span>
            <span style="font-size: 16px; color: #c9a84c; font-weight: bold;">${s2}</span>
          </div>
          <div style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; width: ${s2}; background: #c9a84c;"></div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 16px; font-weight: 500;">Propósito</span>
            <span style="font-size: 16px; color: #c9a84c; font-weight: bold;">${s3}</span>
          </div>
          <div style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; width: ${s3}; background: #c9a84c;"></div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 40px; padding: 0 20px;">
        <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #c9a84c; margin-bottom: 25px; text-align: center;">Seus próximos passos</h3>
        <div style="font-size: 16px; line-height: 1.6;">
          ${passosHTML}
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 80px; padding-top: 40px; border-top: 1px solid rgba(201, 168, 76, 0.2);">
        <p style="font-family: 'Cormorant Garamond', serif; font-size: 26px; font-style: italic; color: #c9a84c; margin-bottom: 10px;">"O milagre começa quando as desculpas terminam!"</p>
        <p style="font-size: 14px; color: rgba(245,240,232,0.6); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 40px;">— Daniel de Mattos</p>
        
        <p style="font-size: 16px; color: #f5f0e8; margin-bottom: 5px;"><strong>Cordão de 3 Dobras Editora</strong></p>
        <p style="font-size: 15px; color: #c9a84c;">damorteparaavida.cordao3dobras.com</p>
      </div>
    `;
    
    // Adicionar estilos locais para renderizar corretamente a lista de passos
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .passo { display: flex; align-items: flex-start; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; border-left: 4px solid #c9a84c; }
      .passo-num { background: #c9a84c; color: #0d1b2e; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 20px; flex-shrink: 0; }
      .passo-texto { margin: 0; color: #f5f0e8; font-size: 16px; line-height: 1.6; }
    `;
    container.appendChild(styleEl);

    document.body.appendChild(container);

    // Mudar o texto do botão para indicar carregamento
    const btn = event.currentTarget;
    const btnTextoOriginal = btn.innerHTML;
    btn.innerHTML = 'Gerando PDF... Aguarde';
    btn.disabled = true;

    try {
      // Usar html2canvas para desenhar o container num canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Melhor resolução
        backgroundColor: '#0d1b2e',
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Criar o PDF no formato A4 retrato
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Se a altura passar de uma página (o que é bem provável no A4), pode dividir ou deixar estendido
      // O jsPDF com a imagem cuidará do ratio, mas para caber na página sem cortar, usamos a altura proporcional
      // Se a imagem for muito alta, vamos precisar dividi-la ou o PDF criará nova página se configurado.
      // Para manter simples, adicionamos a imagem (vai preencher e talvez sobrar, mas costuma caber em 1 pág).
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('meu-perfil-da-morte-para-a-vida.pdf');
      
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Houve um erro ao gerar o PDF. Tente novamente.');
    } finally {
      // Limpar DOM
      document.body.removeChild(container);
      btn.innerHTML = btnTextoOriginal;
      btn.disabled = false;
    }
  }
/* ──────────────────────────────
   INTEGRAÇÃO ALCATEIA DE LEÕES
────────────────────────────── */
function irParaAlcateia() {
  var perfil = document.getElementById('result-nome')
    ? document.getElementById('result-nome').textContent.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace('o ', '').trim()
    : '';

  var mapa = {
    'desperto':    'desperto',
    'adormecido':  'adormecido',
    'caminhante':  'caminhante',
    'edificador':  'edificador'
  };

  var perfilFinal = mapa[perfil] || '';
  var url = 'https://www.alcateiadeleoes.com.br/?origem=damorteparaavida&perfil=' + perfilFinal;
  window.open(url, '_blank');
}
