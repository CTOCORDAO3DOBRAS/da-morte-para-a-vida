"""
crm_sync.py — Sincronização CRM local com webhook da Zapi via Supabase

Simula o fluxo n8n: Zapi Webhook → parse → upsert leads → insert chat_histories
Pode ser executado como servidor Flask local ou importado como módulo pelo n8n (Code node).

Dependências:
    pip install flask supabase python-dotenv

Variáveis de ambiente (.env):
    SUPABASE_URL
    SUPABASE_SERVICE_KEY   # service_role — bypass de RLS necessário para escrita no CRM
"""

import os
import json
import hashlib
from datetime import datetime, timezone
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalizar_telefone(raw: str) -> str:
    """
    Normaliza número recebido da Zapi para o formato E.164.
    A Zapi envia no formato '5511999998888@c.us' ou só '5511999998888'.
    """
    numero = raw.split("@")[0].strip()
    if not numero.startswith("+"):
        numero = f"+{numero}"
    return numero


def gerar_session_id(telefone: str, contexto: str = "sdr") -> str:
    """
    session_id = hash determinístico de (telefone + contexto).
    Garante que o mesmo lead no mesmo fluxo sempre cai na mesma sessão.
    """
    raw = f"{telefone}:{contexto}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


# ---------------------------------------------------------------------------
# Camada de dados
# ---------------------------------------------------------------------------

def upsert_lead(telefone: str, nome: str | None = None) -> dict:
    """
    Cria ou atualiza o lead pela chave lead_id (telefone).
    Retorna o registro resultante.
    """
    payload = {"lead_id": telefone}
    if nome:
        payload["lead_nome"] = nome

    resultado = (
        supabase.table("leads")
        .upsert(payload, on_conflict="lead_id")
        .execute()
    )
    return resultado.data[0] if resultado.data else {}


def salvar_mensagem(
    session_id: str,
    role: str,
    conteudo: str,
    tipo: str = "text",
    metadata: dict | None = None,
) -> dict:
    """
    Insere uma linha em chat_histories.
    role: 'user' | 'assistant' | 'system'
    tipo: 'text' | 'audio' | 'image'
    """
    payload = {
        "session_id": session_id,
        "hora_data_mensagem": datetime.now(timezone.utc).isoformat(),
        "role": role,
        "message": {"type": tipo, "content": conteudo},
        "metadata": metadata or {},
    }
    resultado = supabase.table("chat_histories").insert(payload).execute()
    return resultado.data[0] if resultado.data else {}


def buscar_historico(session_id: str, limite: int = 50) -> list[dict]:
    """
    Recupera as últimas `limite` mensagens de uma sessão, ordem cronológica.
    """
    resultado = (
        supabase.table("chat_histories")
        .select("hora_data_mensagem, role, message, metadata")
        .eq("session_id", session_id)
        .order("hora_data_mensagem", desc=False)
        .limit(limite)
        .execute()
    )
    return resultado.data or []


# ---------------------------------------------------------------------------
# Parser de payload Zapi
# ---------------------------------------------------------------------------

def parse_payload_zapi(payload: dict) -> dict:
    """
    Normaliza o payload bruto do webhook da Zapi.

    Campos mapeados:
      phone     → lead_id (telefone normalizado)
      name      → lead_nome
      body/text → conteúdo da mensagem
      type      → tipo (text | audio | image | document)
      fromMe    → True se a mensagem foi enviada pelo operador

    Estrutura típica do webhook Zapi:
    {
      "phone": "5511999998888",
      "name": "Daniel",
      "type": "ReceivedCallback",
      "message": {
        "type": "text",        # ou "audio", "image"
        "body": "Olá, gostei..."
      },
      "fromMe": false,
      "timestamp": 1716768000
    }
    """
    telefone = normalizar_telefone(payload.get("phone", ""))
    nome = payload.get("name") or payload.get("pushName")

    msg = payload.get("message", {})
    tipo_msg = msg.get("type", "text")
    # Zapi usa 'body' para texto e 'caption' para legendas de mídia
    conteudo = msg.get("body") or msg.get("caption") or msg.get("text") or ""

    from_me = payload.get("fromMe", False)

    return {
        "telefone": telefone,
        "nome": nome,
        "tipo_msg": tipo_msg,
        "conteudo": conteudo,
        "from_me": from_me,
        "timestamp_zapi": payload.get("timestamp"),
    }


# ---------------------------------------------------------------------------
# Fluxo principal de sincronização
# ---------------------------------------------------------------------------

def sincronizar(payload_zapi: dict, contexto: str = "sdr") -> dict:
    """
    Fluxo completo:
    1. Parse do payload Zapi
    2. Upsert do lead
    3. Geração do session_id
    4. Inserção da mensagem no histórico
    5. Retorno do contexto para o próximo nó n8n

    Retorna um dict compatível com o formato de saída de um Code node n8n.
    """
    dados = parse_payload_zapi(payload_zapi)

    if not dados["telefone"] or dados["telefone"] == "+":
        return {"erro": "Payload inválido: campo 'phone' ausente ou vazio."}

    lead = upsert_lead(dados["telefone"], dados["nome"])

    session_id = gerar_session_id(dados["telefone"], contexto)

    role = "assistant" if dados["from_me"] else "user"
    metadata = {
        "agente": contexto,
        "tipo_zapi": dados["tipo_msg"],
        "timestamp_zapi": dados["timestamp_zapi"],
    }

    mensagem = salvar_mensagem(
        session_id=session_id,
        role=role,
        conteudo=dados["conteudo"],
        tipo=dados["tipo_msg"],
        metadata=metadata,
    )

    return {
        "lead": lead,
        "session_id": session_id,
        "mensagem_salva": mensagem,
        "historico_url": f"{SUPABASE_URL}/rest/v1/chat_histories?session_id=eq.{session_id}",
    }


# ---------------------------------------------------------------------------
# Endpoint HTTP (modo servidor local / mock de webhook)
# ---------------------------------------------------------------------------

@app.route("/webhook/zapi", methods=["POST"])
def webhook_zapi():
    """
    Recebe o payload bruto da Zapi e executa a sincronização.
    Use este endpoint como destino do webhook no painel da Zapi
    durante desenvolvimento local.

    Exemplo de chamada:
        curl -X POST http://localhost:5000/webhook/zapi \
             -H "Content-Type: application/json" \
             -d @payload_zapi_exemplo.json
    """
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"erro": "Payload JSON inválido ou ausente."}), 400

    contexto = request.args.get("contexto", "sdr")

    try:
        resultado = sincronizar(payload, contexto=contexto)
        return jsonify(resultado), 200
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500


@app.route("/historico/<telefone>", methods=["GET"])
def ver_historico(telefone: str):
    """
    Retorna o histórico de chat de um lead pelo número de telefone.
    Útil para debug e para alimentar o contexto do agente closer.

    Exemplo:
        GET /historico/5511999998888?contexto=sdr&limite=20
    """
    telefone_norm = normalizar_telefone(telefone)
    contexto = request.args.get("contexto", "sdr")
    limite = int(request.args.get("limite", 50))
    session_id = gerar_session_id(telefone_norm, contexto)
    historico = buscar_historico(session_id, limite=limite)
    return jsonify({"session_id": session_id, "mensagens": historico}), 200


# ---------------------------------------------------------------------------
# Payload de exemplo — simulação local do lead Daniel
# ---------------------------------------------------------------------------

PAYLOAD_DANIEL_EXEMPLO = {
    "phone": "5511999998888",
    "name": "Daniel",
    "type": "ReceivedCallback",
    "fromMe": False,
    "timestamp": int(datetime.now(timezone.utc).timestamp()),
    "message": {
        "type": "audio",
        "body": (
            "Gostei muito do criativo estilo Hormozi. "
            "Quero escalar meu e-commerce de joias e automatizar meu atendimento "
            "no WhatsApp com o CRM Supabase. Quanto custa o plano Enterprise de vocês?"
        ),
    },
}


def simular_dry_run(payload_zapi: dict, contexto: str = "sdr") -> None:
    """
    Executa toda a lógica de parse e transformação localmente,
    sem realizar nenhuma chamada de rede ao Supabase.
    Útil para validar o pipeline em ambientes sem conectividade.
    """
    print("=" * 60)
    print("  CRM SYNC — DRY RUN (sem chamadas de rede)")
    print("=" * 60)

    print("\n[1/5] PAYLOAD BRUTO RECEBIDO DA ZAPI:")
    print(json.dumps(payload_zapi, indent=2, ensure_ascii=False))

    dados = parse_payload_zapi(payload_zapi)
    print("\n[2/5] DADOS NORMALIZADOS:")
    print(json.dumps(dados, indent=2, ensure_ascii=False, default=str))

    session_id = gerar_session_id(dados["telefone"], contexto)
    print(f"\n[3/5] SESSION_ID GERADO (SHA-256 determinístico):")
    print(f"  entrada  → '{dados['telefone']}:{contexto}'")
    print(f"  session_id → {session_id}")

    role = "assistant" if dados["from_me"] else "user"
    registro_lead = {
        "id": "<uuid-gerado-pelo-supabase>",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lead_nome": dados["nome"],
        "lead_id": dados["telefone"],
    }
    print("\n[4/5] REGISTRO QUE SERIA UPSERTADO EM 'leads':")
    print(json.dumps(registro_lead, indent=2, ensure_ascii=False))

    registro_mensagem = {
        "id": "<uuid-gerado-pelo-supabase>",
        "session_id": session_id,
        "hora_data_mensagem": datetime.now(timezone.utc).isoformat(),
        "role": role,
        "message": {"type": dados["tipo_msg"], "content": dados["conteudo"]},
        "metadata": {
            "agente": contexto,
            "tipo_zapi": dados["tipo_msg"],
            "timestamp_zapi": dados["timestamp_zapi"],
        },
    }
    print("\n[5/5] REGISTRO QUE SERIA INSERIDO EM 'chat_histories':")
    print(json.dumps(registro_mensagem, indent=2, ensure_ascii=False))

    print("\n" + "=" * 60)
    print("  RESULTADO FINAL (retorno para o nó n8n)")
    print("=" * 60)
    saida_n8n = {
        "lead": registro_lead,
        "session_id": session_id,
        "mensagem_salva": registro_mensagem,
        "historico_url": f"<SUPABASE_URL>/rest/v1/chat_histories?session_id=eq.{session_id}",
        "dry_run": True,
    }
    print(json.dumps(saida_n8n, indent=2, ensure_ascii=False))
    print("\n[OK] Dry run concluído. Pipeline validado sem chamadas de rede.")


if __name__ == "__main__":
    import sys

    args = sys.argv[1:]

    if "--simular" in args and "--dry-run" in args:
        simular_dry_run(PAYLOAD_DANIEL_EXEMPLO, contexto="sdr")
    elif "--simular" in args:
        print("\n[SIMULAÇÃO] Processando payload do lead Daniel...\n")
        try:
            resultado = sincronizar(PAYLOAD_DANIEL_EXEMPLO, contexto="sdr")
            print(json.dumps(resultado, indent=2, ensure_ascii=False))
        except Exception as exc:
            causa = str(exc)
            if "Name or service not known" in causa or "ConnectError" in type(exc).__name__:
                print("[ERRO DE REDE] Sem acesso ao Supabase neste ambiente.")
                print(f"  Detalhe: {type(exc).__name__} — {causa[:80]}")
                print("\nFallback automático → executando dry-run local:\n")
                simular_dry_run(PAYLOAD_DANIEL_EXEMPLO, contexto="sdr")
            else:
                raise
    else:
        print("Servidor CRM Sync rodando em http://localhost:5000")
        print("Endpoint webhook: POST /webhook/zapi")
        print("Visualizar histórico: GET /historico/<telefone>")
        app.run(host="0.0.0.0", port=5000, debug=True)
