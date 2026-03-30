const form = document.getElementById("pid-form");
const statusMessage = document.getElementById("status-message");

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
    if (response.startsWith("Recibido: ")) {
        return response.replace("Recibido: ", "");
    }
    return response;
}

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const joint = document.getElementById("joint").value;
    const kp = document.getElementById("kp").value;
    const ki = document.getElementById("ki").value;
    const kd = document.getElementById("kd").value;

    statusMessage.innerHTML = "<p>Enviando datos...</p>";

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

        let confirmationsHtml = "";

        if (result.responses && result.responses.length > 0) {
            confirmationsHtml = `
                <h3>Confirmación desde Arduino</h3>
                <ul>
                    ${result.responses.map(item => `
                        <li>${formatArduinoResponse(item)}</li>
                    `).join("")}
                </ul>
            `;
        }

        statusMessage.innerHTML = `
            <p><strong>Estado:</strong> ${result.message}</p>
            <p><strong>Articulación:</strong> ${jointName}</p>
            <p><strong>Valores enviados:</strong></p>
            <ul>
                <li><strong>Kp:</strong> ${result.kp}</li>
                <li><strong>Ki:</strong> ${result.ki}</li>
                <li><strong>Kd:</strong> ${result.kd}</li>
            </ul>
            <p><strong>Total de comandos enviados:</strong> ${result.commands.length}</p>
            ${confirmationsHtml}
        `;

        console.log("Respuesta del servidor:", result);

    } catch (error) {
        console.error("Error:", error);
        statusMessage.innerHTML = `
            <p><strong>Error:</strong> no se pudieron enviar los datos.</p>
        `;
    }
});