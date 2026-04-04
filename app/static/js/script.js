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

function updateSliderVisual(input, output) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const percent = ((value - min) / (max - min)) * 100;

    output.textContent = Number(value).toFixed(2);
    input.style.background = `linear-gradient(to right, #f0c20f 0%, #f0c20f ${percent}%, #cfd5e2 ${percent}%, #cfd5e2 100%)`;
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
        const jointName = getJointName(result.joint);

        updatePidTable(result.joint, result.kp, result.ki, result.kd);

        statusMessage.innerHTML = `
            <p><strong>Estado:</strong> ${result.message}</p>
            <p><strong>Última articulación actualizada:</strong> ${jointName}</p>
            <p><strong>Total de comandos enviados:</strong> ${result.commands.length}</p>
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

    } catch (error) {
        console.error("Error:", error);
        statusMessage.innerHTML = `
            <p><strong>Error:</strong> no se pudieron enviar los datos.</p>
        `;
    }
});