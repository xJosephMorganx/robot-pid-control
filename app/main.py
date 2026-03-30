from flask import Flask, render_template, request, jsonify
import serial
import time

app = Flask(__name__)

# ============================
# Configuración serial
# ============================
SERIAL_PORT = "/dev/ttyACM0"
BAUD_RATE = 115200

ser = None

try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)  # esperar a que Arduino reinicie
    print(f"[OK] Conectado a {SERIAL_PORT}")
except Exception as e:
    print(f"[ERROR] No se pudo abrir el puerto serial: {e}")


# ============================
# Construcción de comandos
# ============================
def build_pid_commands(joint, kp, ki, kd):
    if joint == "ALL":
        joints = ["B", "S", "E", "W"]
    else:
        joints = [joint]

    commands = []

    for j in joints:
        command = f"{j},{kp},{ki},{kd}"
        commands.append(command)

    return commands


# ============================
# Rutas Flask
# ============================
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
    responses = []

    for command in commands:
        print(f"Enviando comando: {command}")

        if ser:
            ser.write((command + "\n").encode())

            time.sleep(0.1)

            if ser.in_waiting > 0:
                response = ser.readline().decode().strip()
                print(f"Arduino dice: {response}")
                responses.append(response)
            else:
                responses.append("Sin respuesta del Arduino")
        else:
            responses.append("Puerto serial no disponible")

    return jsonify({
        "status": "ok",
        "joint": joint,
        "kp": kp,
        "ki": ki,
        "kd": kd,
        "commands": commands,
        "responses": responses,
        "message": "Datos enviados correctamente"
    })


if __name__ == "__main__":
    app.run(debug=True)