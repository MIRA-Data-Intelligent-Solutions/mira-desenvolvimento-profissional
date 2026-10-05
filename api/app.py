from flask import Flask, jsonify
from dados import usuarios

app = Flask(__name__)
app.json.ensure_ascii = False


@app.route("/")
def inicio():
    return jsonify({
        "mensagem": "API fictícia de cursos funcionando!"
    })


@app.route("/usuarios")
def listar_usuarios():
    return jsonify(usuarios)


@app.route("/usuarios/<int:id_usuario>")
def buscar_usuario(id_usuario):

    for usuario in usuarios:

        if usuario["id_usuario"] == id_usuario:
            return jsonify(usuario)

    return jsonify({
        "erro": "Usuário não encontrado"
    }), 404


if __name__ == "__main__":
    app.run(debug=True)