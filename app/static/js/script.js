const form = document.getElementById("pid-form");
const statusMessage = document.getElementById("status-message");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const joint = document.getElementById("joint").value;
    const kp = document.getElementById("kp").value;
    const ki = document.getElementById("ki").value;
    const kd = document.getElementById("kd").value;

    try {
        const response = await fetch("/api/pid", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ joint, kp, ki, kd })
        });

        const result = await response.json();

        statusMessage.textContent = result.message;

        console.log("Respuesta del servidor:", result);

    } catch (error) {
        console.error("Error:", error);
        statusMessage.textContent = "Error al enviar datos";
    }
});