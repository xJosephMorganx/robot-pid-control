const form = document.getElementById("pid-form");
const statusMessage = document.getElementById("status-message");
const arduinoConfirmation = document.getElementById("arduino-confirmation");

const kpInput = document.getElementById("kp");
const kiInput = document.getElementById("ki");
const kdInput = document.getElementById("kd");

const kpValue = document.getElementById("kp-value");
const kiValue = document.getElementById("ki-value");
const kdValue = document.getElementById("kd-value");

function getJointName(joint) {
    const names = {
        B: "Base",
        S: "Shoulder",
        E: "Elbow",
        W: "Wrist",
        ALL: "Global"
    };
    return names[joint] || joint;
}

function formatArduinoResponse(response) {
    if (!response.startsWith("Recibido: ")) {
        return `<li>${response}</li>`;
    }

    const cleanResponse = response.replace("Recibido: ", "");
    const parts = cleanResponse.split(",");

    if (parts.length !== 4) {
        return `<li>${cleanResponse}</li>`;
    }

    const [jointCode, kp, ki, kd] = parts;
    const jointName = getJointName(jointCode);

    return `
        <li>
            <strong>${jointName} confirmada</strong><br>
            Kp: ${kp} | Ki: ${ki} | Kd: ${kd}
        </li>
    `;
}

function updatePidTable(joint, kp, ki, kd) {
    const joints = ["B", "S", "E", "W"];

    if (joint === "ALL") {
        joints.forEach(code => {
            document.getElementById(`kp-${code}`).textContent = kp;
            document.getElementById(`ki-${code}`).textContent = ki;
            document.getElementById(`kd-${code}`).textContent = kd;
        });
    } else {
        document.getElementById(`kp-${joint}`).textContent = kp;
        document.getElementById(`ki-${joint}`).textContent = ki;
        document.getElementById(`kd-${joint}`).textContent = kd;
    }
}

function clearPidTable() {
    const joints = ["B", "S", "E", "W"];

    joints.forEach(code => {
        document.getElementById(`kp-${code}`).textContent = "--";
        document.getElementById(`ki-${code}`).textContent = "--";
        document.getElementById(`kd-${code}`).textContent = "--";
    });
}

function updateSliderVisual(input, output) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const percent = ((value - min) / (max - min)) * 100;

    output.textContent = Number(value).toFixed(2);
    input.style.background = `linear-gradient(to right, #f0c20f 0%, #f0c20f ${percent}%, #cfd5e2 ${percent}%, #cfd5e2 100%)`;
}

async function updateConnectionStatus() {
    const badge = document.querySelector(".status-badge");

    try {
        const response = await fetch("/api/status");
        const data = await response.json();

        if (data.status === "online") {
            badge.textContent = "En línea";
            badge.style.backgroundColor = "#2ecc71";
        } else if (data.status === "simulation") {
            badge.textContent = "Simulación";
            badge.style.backgroundColor = "#f1c40f";
        } else {
            badge.textContent = "Sin conexión";
            badge.style.backgroundColor = "#e74c3c";

            clearPidTable();

            statusMessage.innerHTML = `
                <p><strong>Error:</strong> Arduino sin conexión.</p>
                <p><strong>Última articulación actualizada:</strong> Ninguna</p>
                <p><strong>Total de comandos enviados correctamente:</strong> 0</p>
            `;

            arduinoConfirmation.innerHTML = "";
        }
    } catch (error) {
        badge.textContent = "Error";
        badge.style.backgroundColor = "#e74c3c";

        clearPidTable();

        statusMessage.innerHTML = `
            <p><strong>Error:</strong> no se pudo verificar la conexión con Arduino.</p>
            <p><strong>Última articulación actualizada:</strong> Ninguna</p>
            <p><strong>Total de comandos enviados correctamente:</strong> 0</p>
        `;

        arduinoConfirmation.innerHTML = "";
    }
}

const sliderMap = [
    [kpInput, kpValue],
    [kiInput, kiValue],
    [kdInput, kdValue]
];

sliderMap.forEach(([input, output]) => {
    updateSliderVisual(input, output);
    input.addEventListener("input", () => {
        updateSliderVisual(input, output);
    });
});

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const joint = document.getElementById("joint").value;
    const kp = kpInput.value;
    const ki = kiInput.value;
    const kd = kdInput.value;

    statusMessage.innerHTML = `<p><strong>Estado:</strong> Enviando datos...</p>`;
    arduinoConfirmation.innerHTML = "";

    try {
        const response = await fetch("/api/pid", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ joint, kp, ki, kd })
        });

        const result = await response.json();

        const appliedJointName = result.last_success_joint
            ? getJointName(result.last_success_joint)
            : "Ninguna";

        if (result.status === "ok" || result.status === "partial") {
            updatePidTable(result.joint, result.kp, result.ki, result.kd);
        }

        let statusLabel = "Estado";

        if (result.status === "ok") {
            statusLabel = "Éxito";
        } else if (result.status === "partial") {
            statusLabel = "Parcial";
        } else if (result.status === "error") {
            statusLabel = "Error";
        }

        statusMessage.innerHTML = `
            <p><strong>${statusLabel}:</strong> ${result.message}</p>
            <p><strong>Última articulación actualizada:</strong> ${appliedJointName}</p>
            <p><strong>Total de comandos enviados correctamente:</strong> ${result.successful_commands}</p>
        `;

        let confirmationsHtml = "";

        if (result.responses && result.responses.length > 0) {
            confirmationsHtml = `
                <h3>Confirmación desde Arduino</h3>
                <ul>
                    ${result.responses.map(item => formatArduinoResponse(item)).join("")}
                </ul>
            `;
        }

        arduinoConfirmation.innerHTML = confirmationsHtml;
        console.log("Respuesta del servidor:", result);

        updateConnectionStatus();

    } catch (error) {
        console.error("Error:", error);
        clearPidTable();

        statusMessage.innerHTML = `
            <p><strong>Error:</strong> no se pudieron enviar los datos.</p>
            <p><strong>Última articulación actualizada:</strong> Ninguna</p>
            <p><strong>Total de comandos enviados correctamente:</strong> 0</p>
        `;

        arduinoConfirmation.innerHTML = "";
        updateConnectionStatus();
    }
});

// Ejecutar al cargar la página
updateConnectionStatus();

// Actualizar el estado cada 3 segundos
setInterval(updateConnectionStatus, 3000);