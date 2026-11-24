"""Gera os arquivos do MODO LOCAL do front a partir da API.

O front (js/comum/dados.js) tem FONTE.modo = 'local', que lê arquivos .json no MESMO formato que a
API devolve. Este script faz login com as contas de teste, chama todas as rotas de leitura e salva
cada resposta no caminho que o modo local procura:

    /setores                    -> data/setores.json
    /colaboradores/4            -> data/colaboradores/4.json
    /me/cursos (colaborador)    -> data/colaborador/me/cursos.json   (rotas /me ficam por perfil)
    POST /login                 -> data/login/gestor.json            (token trocado por "modo-local")

Uso (com a API rodando):
    python gerar_dados_locais.py --api http://localhost:8000 \
        --gestor carlos.lima@empresa.com SENHA --colaborador ana.souza@empresa.com SENHA

Rode de novo sempre que a API mudar de formato. Usa só a biblioteca padrão do Python.
"""
import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

PASTA_PADRAO = Path(__file__).resolve().parents[2] / "frontend" / "mira-evolution" / "data"
VALIDADE_LOCAL_MINUTOS = 480   # sessão do modo local: 8 horas (dá para uma apresentação inteira)


def chamar(api, caminho, token=None, corpo=None):
    dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(api + caminho, data=dados, method="POST" if corpo is not None else "GET")
    req.add_header("Accept", "application/json")
    if corpo is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as erro:
        sys.exit(f"Erro {erro.code} em {caminho}: {erro.read().decode('utf-8', 'replace')}")


def salvar(pasta, caminho_relativo, conteudo):
    arquivo = pasta / (caminho_relativo.lstrip("/") + ".json")
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    arquivo.write_text(json.dumps(conteudo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("  ", arquivo.relative_to(pasta))


def entrar(api, pasta, perfil, email, senha):
    resposta = chamar(api, "/login", corpo={"email": email, "senha": senha})
    if resposta["usuario"]["role"] != perfil:
        sys.exit(f"A conta {email} não é de {perfil}.")
    token, id_usuario = resposta["access_token"], resposta["usuario"]["userId"]
    resposta.update(access_token="modo-local", expira_em_minutos=VALIDADE_LOCAL_MINUTOS)
    salvar(pasta, f"login/{perfil}", resposta)
    return token, id_usuario


def main():
    p = argparse.ArgumentParser(description="Gera os .json do modo local do front a partir da API.")
    p.add_argument("--api", default="http://localhost:8000")
    p.add_argument("--gestor", nargs=2, metavar=("EMAIL", "SENHA"), required=True)
    p.add_argument("--colaborador", nargs=2, metavar=("EMAIL", "SENHA"), required=True)
    p.add_argument("--saida", type=Path, default=PASTA_PADRAO)
    args = p.parse_args()
    api, pasta = args.api.rstrip("/"), args.saida

    print("Gestor:")
    token, _ = entrar(api, pasta, "gestor", *args.gestor)
    for caminho in ["/dashboard/gestor", "/setores", "/setores/opcoes", "/colaboradores",
                    "/progresso", "/cursos", "/configuracoes"]:
        salvar(pasta, caminho, chamar(api, caminho, token))
    salvar(pasta, "/gestor/me/perfil", chamar(api, "/me/perfil", token))
    for item in chamar(api, "/colaboradores", token)["items"]:
        salvar(pasta, f"/colaboradores/{item['id']}", chamar(api, f"/colaboradores/{item['id']}", token))

    print("Colaborador:")
    token, id_proprio = entrar(api, pasta, "colaborador", *args.colaborador)
    salvar(pasta, "/dashboard/colaborador", chamar(api, "/dashboard/colaborador", token))
    for caminho in ["/me/cursos", "/me/perfil"]:
        salvar(pasta, "/colaborador" + caminho, chamar(api, caminho, token))
    for curso in chamar(api, "/me/cursos", token)["items"]:
        caminho = f"/me/cursos/{curso['courseId']}"
        salvar(pasta, "/colaborador" + caminho, chamar(api, caminho, token))
    # o "Meu progresso" do colaborador usa /colaboradores/<id dele>
    salvar(pasta, f"/colaboradores/{id_proprio}", chamar(api, f"/colaboradores/{id_proprio}", token))

    print("Pronto. Use FONTE.modo = 'local' em js/comum/dados.js para ler estes arquivos.")


if __name__ == "__main__":
    main()
