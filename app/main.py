from flask import Flask, render_template, request, jsonify
import serial
import time

app = Flask(__name__)

# ============================
# Configuración general
# ============================
SIMULATION_MODE = False  # True = simula Arduino, False = usa serial real

# ============================
# Configuración serial
# ============================
SERIAL_PORT = "/dev/ttyACM0"  # Puerto serial del Arduino
BAUD_RATE = 115200

ser = None


# ============================
# Inicialización serial
# ============================
def open_serial():
    global ser

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)
        print(f"[OK] Conectado a {SERIAL_PORT}")
        return True
    except Exception as e:
        print(f"[ERROR] No se pudo abrir el puerto serial: {e}")
        ser = None
        return False


if not SIMULATION_MODE:
    open_serial()
else:
    print("[INFO] Modo simulacion activo: no se abrira puerto serial")


# ============================
# Verificar / reconectar serial
# ============================
def check_serial_connection():
    global ser

    if SIMULATION_MODE:
        return "simulation"

    try:
        # Si ya existe, verificar que siga sano
        if ser and ser.is_open:
            _ = ser.in_waiting
            return "online"

    except Exception:
        try:
            ser.close()
        except Exception:
            pass
        ser = None
        return "offline"

    # Si no hay conexión, intentar abrir de nuevo
    if open_serial():
        return "online"

    return "offline"


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
# Simulación de respuesta Arduino
# ============================
def simulate_arduino_response(command):
    return f"Recibido: {command}"


# ============================
# Rutas Flask
# ============================
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    status = check_serial_connection()

    return jsonify({
        "status": status,
        "connected": status == "online"
    })


@app.route("/api/pid", methods=["POST"])
def receive_pid():
    global ser

    data = request.get_json()

    joint = data.get("joint")
    kp = data.get("kp")
    ki = data.get("ki")
    kd = data.get("kd")

    commands = build_pid_commands(joint, kp, ki, kd)
    responses = []

    for command in commands:
        print(f"Enviando comando: {command}")

        if SIMULATION_MODE:
            response = simulate_arduino_response(command)
            print(f"Arduino simulado dice: {response}")
            responses.append(response)
            continue

        # Revisar/reconectar antes de enviar
        if check_serial_connection() != "online":
            responses.append("Puerto serial no disponible")
            continue

        try:
            ser.write((command + "\n").encode())
            time.sleep(0.1)

            if ser.in_waiting > 0:
                response = ser.readline().decode().strip()
                print(f"Arduino dice: {response}")
                responses.append(response)
            else:
                responses.append("Sin respuesta del Arduino")

        except Exception as e:
            print(f"[ERROR] Fallo de escritura serial: {e}")

            try:
                ser.close()
            except Exception:
                pass

            ser = None
            responses.append("Puerto serial desconectado")

    # ============================
    # Resultado final del envío
    # ============================
    success_count = 0
    last_success_joint = None

    for i, response in enumerate(responses):
        if (
            response != "Puerto serial no disponible"
            and response != "Puerto serial desconectado"
            and response != "Sin respuesta del Arduino"
        ):
            success_count += 1

            sent_command = commands[i]
            joint_code = sent_command.split(",")[0]
            last_success_joint = joint_code

    if success_count == len(commands):
        final_status = "ok"
        final_message = "Datos enviados correctamente"
    elif success_count > 0:
        final_status = "partial"
        final_message = "Solo algunos comandos se enviaron correctamente"
    else:
        final_status = "error"
        final_message = "No se pudieron enviar los datos al Arduino"

    return jsonify({
        "status": final_status,
        "joint": joint,
        "kp": kp,
        "ki": ki,
        "kd": kd,
        "commands": commands,
        "responses": responses,
        "message": final_message,
        "simulation_mode": SIMULATION_MODE,
        "successful_commands": success_count,
        "last_success_joint": last_success_joint
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)