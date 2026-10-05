from flask import Flask, jsonify

from dados import (
    Plano,
    Empresa,
    Setor,
    Usuario,
    Plataforma,
    Empresa_plataforma,
    Categoria,
    Curso,
    Competencia,
    Curso_Competencia,
    Curso_Usuario,
    Registro_Progresso
)


app = Flask(__name__)

# Permite acentos no JSON
app.json.ensure_ascii = False


# =====================================================
# ROTA INICIAL
# =====================================================

@app.route("/")
def inicio():
    return jsonify({
        "mensagem": "API do sistema_cursos funcionando!"
    })


# =====================================================
# PLANO
# =====================================================

@app.route("/Plano")
def listar_plano():
    return jsonify(Plano)


@app.route("/Plano/<int:id_plano>")
def buscar_plano(id_plano):

    for plano in Plano:
        if plano["id_plano"] == id_plano:
            return jsonify(plano)

    return jsonify({
        "erro": "Plano nao encontrado"
    }), 404


# =====================================================
# EMPRESA
# =====================================================

@app.route("/Empresa")
def listar_empresa():
    return jsonify(Empresa)


@app.route("/Empresa/<int:id_empresa>")
def buscar_empresa(id_empresa):

    for empresa in Empresa:
        if empresa["id_empresa"] == id_empresa:
            return jsonify(empresa)

    return jsonify({
        "erro": "Empresa nao encontrada"
    }), 404


# =====================================================
# SETOR
# =====================================================

@app.route("/Setor")
def listar_setor():
    return jsonify(Setor)


@app.route("/Setor/<int:id_setor>")
def buscar_setor(id_setor):

    for setor in Setor:
        if setor["id_setor"] == id_setor:
            return jsonify(setor)

    return jsonify({
        "erro": "Setor nao encontrado"
    }), 404


# =====================================================
# USUARIO
# =====================================================

@app.route("/Usuario")
def listar_usuario():

    resultado = []

    for usuario in Usuario:

        resultado.append({
            "id_usuario": usuario["id_usuario"],
            "id_empresa": usuario["id_empresa"],
            "id_setor": usuario["id_setor"],
            "id_gestor": usuario["id_gestor"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "papel_acesso": usuario["papel_acesso"],
            "ativo": usuario["ativo"]
        })

    return jsonify(resultado)


@app.route("/Usuario/<int:id_usuario>")
def buscar_usuario(id_usuario):

    for usuario in Usuario:

        if usuario["id_usuario"] == id_usuario:

            return jsonify({
                "id_usuario": usuario["id_usuario"],
                "id_empresa": usuario["id_empresa"],
                "id_setor": usuario["id_setor"],
                "id_gestor": usuario["id_gestor"],
                "nome": usuario["nome"],
                "email": usuario["email"],
                "papel_acesso": usuario["papel_acesso"],
                "ativo": usuario["ativo"]
            })

    return jsonify({
        "erro": "Usuario nao encontrado"
    }), 404


# =====================================================
# PLATAFORMA
# =====================================================

@app.route("/Plataforma")
def listar_plataforma():
    return jsonify(Plataforma)


@app.route("/Plataforma/<int:id_plataforma>")
def buscar_plataforma(id_plataforma):

    for plataforma in Plataforma:

        if plataforma["id_plataforma"] == id_plataforma:
            return jsonify(plataforma)

    return jsonify({
        "erro": "Plataforma nao encontrada"
    }), 404


# =====================================================
# EMPRESA_PLATAFORMA
# =====================================================

@app.route("/Empresa_plataforma")
def listar_empresa_plataforma():
    return jsonify(Empresa_plataforma)


# =====================================================
# CATEGORIA
# =====================================================

@app.route("/Categoria")
def listar_categoria():
    return jsonify(Categoria)


@app.route("/Categoria/<int:id_categoria>")
def buscar_categoria(id_categoria):

    for categoria in Categoria:

        if categoria["id_categoria"] == id_categoria:
            return jsonify(categoria)

    return jsonify({
        "erro": "Categoria nao encontrada"
    }), 404


# =====================================================
# CURSO
# =====================================================

@app.route("/Curso")
def listar_curso():
    return jsonify(Curso)


@app.route("/Curso/<int:id_curso>")
def buscar_curso(id_curso):

    for curso in Curso:

        if curso["id_curso"] == id_curso:
            return jsonify(curso)

    return jsonify({
        "erro": "Curso nao encontrado"
    }), 404


# =====================================================
# COMPETENCIA
# =====================================================

@app.route("/Competencia")
def listar_competencia():
    return jsonify(Competencia)


@app.route("/Competencia/<int:id_competencia>")
def buscar_competencia(id_competencia):

    for competencia in Competencia:

        if competencia["id_competencia"] == id_competencia:
            return jsonify(competencia)

    return jsonify({
        "erro": "Competencia nao encontrada"
    }), 404


# =====================================================
# CURSO_COMPETENCIA
# =====================================================

@app.route("/Curso_Competencia")
def listar_curso_competencia():
    return jsonify(Curso_Competencia)


# =====================================================
# CURSO_USUARIO
# =====================================================

@app.route("/Curso_Usuario")
def listar_curso_usuario():
    return jsonify(Curso_Usuario)


@app.route("/Curso_Usuario/<int:id_curso_usuario>")
def buscar_curso_usuario(id_curso_usuario):

    for curso_usuario in Curso_Usuario:

        if curso_usuario["id_curso_usuario"] == id_curso_usuario:
            return jsonify(curso_usuario)

    return jsonify({
        "erro": "Curso_Usuario nao encontrado"
    }), 404


# =====================================================
# REGISTRO_PROGRESSO
# =====================================================

@app.route("/Registro_Progresso")
def listar_registro_progresso():
    return jsonify(Registro_Progresso)


# =====================================================
# CURSOS DE UM USUARIO
# =====================================================

@app.route("/Usuario/<int:id_usuario>/Curso_Usuario")
def cursos_do_usuario(id_usuario):

    resultado = []

    for curso_usuario in Curso_Usuario:

        if curso_usuario["id_usuario"] == id_usuario:

            resultado.append(curso_usuario)

    return jsonify(resultado)


# =====================================================
# PROGRESSO DE UMA MATRICULA
# =====================================================

@app.route("/Curso_Usuario/<int:id_curso_usuario>/Registro_Progresso")
def progresso_do_curso_usuario(id_curso_usuario):

    resultado = []

    for registro in Registro_Progresso:

        if registro["id_curso_usuario"] == id_curso_usuario:

            resultado.append(registro)

    return jsonify(resultado)


# =====================================================
# INICIAR API
# =====================================================

if __name__ == "__main__":
    app.run(debug=True)