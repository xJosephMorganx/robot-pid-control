from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


def build_pid_commands(joint, kp, ki, kd):
    """
    Construye uno o varios comandos con el formato que espera Arduino.
    Retorna una lista de strings.
    """
    if joint == "ALL":
        joints = ["B", "S", "E", "W"]
    else:
        joints = [joint]

    commands = []

    for j in joints:
        command = f"{j},{kp},{ki},{kd}"
        commands.append(command)

    return commands


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/pid", methods=["POST"])
def receive_pid():
    data = request.get_json()

    joint = data.get("joint")
    kp = data.get("kp")
    ki = data.get("ki")
    kd = data.get("kd")

    commands = build_pid_commands(joint, kp, ki, kd)

    for command in commands:
        print(f"Enviando comando: {command}")

    return jsonify({
        "status": "ok",
        "message": f"Se generaron {len(commands)} comando(s) para {joint}",
        "commands": commands
    })


if __name__ == "__main__":
    app.run(debug=True)