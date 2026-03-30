from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


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

    print(f"PID recibido -> {joint}, {kp}, {ki}, {kd}")

    return jsonify({
        "status": "ok",
        "message": f"PID recibido para {joint}"
    })


if __name__ == "__main__":
    app.run(debug=True)