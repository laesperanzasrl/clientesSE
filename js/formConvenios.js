// ============================================================
//  SUPER EUROPA — Alta de Clientes con Convenio (Uso en Cajas)
// ============================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYUgu2iKe0q3B7pregt7vdssFR0m1XMHcmNtBYEgeY_enecmIrQucfjbiYNLbgpouW/exec";

// ─── DOM refs ────────────────────────────────────────────────
const form = document.getElementById("clientForm");
const btnSubmit = document.getElementById("btnSubmit");
const loadingOverlay = document.getElementById("loadingOverlay");
const modalOverlay = document.getElementById("modalOverlay");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMsg = document.getElementById("modalMsg");
const modalErrors = document.getElementById("modalErrors");
const modalBtn = document.getElementById("modalBtn");

// ─── Cargar Convenios al inicio ───────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const selectConvenio = document.getElementById("convenio");
    if (!selectConvenio) return;
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();

        if (data.convenios) {
            selectConvenio.innerHTML = '<option value="">Selecciona la entidad o comercio</option>';
            data.convenios.forEach(convenio => {
                // Removemos la opcion de "No pertenezco" ya que este form es EXCLUSIVO de convenios.
                if(!["NO PERTENEZCO A NINGUNO", "NINGUNO", "NO", "SIN CONVENIO"].includes(convenio.toUpperCase())) {
                    const option = document.createElement("option");
                    option.value = convenio;
                    option.textContent = convenio;
                    selectConvenio.appendChild(option);
                }
            });
        } else {
            selectConvenio.innerHTML = '<option value="">No hay convenios disponibles</option>';
        }
    } catch (error) {
        console.error("Error cargando los convenios:", error);
        selectConvenio.innerHTML = '<option value="">Error cargando convenios</option>';
    }
});

// ─── Helpers ─────────────────────────────────────────────────
function setLoading(on) {
    loadingOverlay.classList.toggle("active", on);
    btnSubmit.disabled = on;
}

function showModal({ type, title, message, errors = [] }) {
    modalIcon.className = "modal-icon " + type;
    modalIcon.innerHTML = type === "success" ? "✅" : "❌";

    modalTitle.className = "modal-title " + type;
    modalTitle.textContent = title;
    modalMsg.textContent = message;

    if (errors.length) {
        modalErrors.style.display = "block";
        modalErrors.innerHTML = errors.map(e => `<li>${e}</li>`).join("");
    } else {
        modalErrors.style.display = "none";
        modalErrors.innerHTML = "";
    }

    modalBtn.className = "btn-modal " + type;
    modalBtn.textContent = type === "success" ? "¡Genial!" : "Entendido";

    modalOverlay.classList.add("active");
}

function closeModal() {
    modalOverlay.classList.remove("active");
}

function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
}

// ─── Validación ───────────────────────────────────────────────
function validate(data) {
    const errors = [];

    if (!data.nombre.trim())
        errors.push("El nombre y apellido es obligatorio.");

    if (!data.dni.trim()) {
        errors.push("El DNI es obligatorio.");
    } else if (!/^\d{7,8}$/.test(data.dni.trim())) {
        errors.push("El DNI debe tener entre 7 y 8 dígitos, sin puntos ni espacios.");
    }

    if (!data.celular.trim()) {
        errors.push("El celular es obligatorio.");
    }

    if (!data.pregunta4) {
        errors.push("Debes seleccionar la sucursal de alta.");
    }

    if (!data.convenio || data.convenio.trim() === "") {
        errors.push("Debes seleccionar a qué entidad pertenece el cliente.");
    }

    return errors;
}

// ─── Submit ───────────────────────────────────────────────────
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = {
        nombre: document.getElementById("nombre").value.trim(),
        dni: document.getElementById("dni").value.trim(),
        celular: document.getElementById("celular").value.trim(),
        fechaNac: document.getElementById("fechaNac").value.trim(),
        domicilio: document.getElementById("domicilio").value.trim(),
        
        // Las preguntas 1, 2 y 3 no existen en este form. Las rellenamos estáticas:
        pregunta1: [],
        pregunta2: [],
        pregunta3: [],
        pregunta4: getRadio("p4"),
        
        comentarios: document.getElementById("comentarios").value.trim(),
        convenio: document.getElementById("convenio").value,
    };

    // Validación client-side
    const errors = validate(data);
    if (errors.length) {
        showModal({
            type: "error",
            title: "Faltan datos",
            message: "Por favor revisá los siguientes campos:",
            errors
        });
        return;
    }

    // Armar payload
    const payload = {
        nombre: data.nombre,
        dni: data.dni.replace(/\./g, ""),
        celular: data.celular,
        fechaNac: data.fechaNac,
        domicilio: data.domicilio,
        pregunta1: "ALTA POR CAJA - CONVENIO",
        pregunta2: "OMITIDA",
        pregunta3: "OMITIDA",
        pregunta4: data.pregunta4,
        comentarios: data.comentarios,
        convenio: data.convenio,
    };

    // Enviar
    setLoading(true);
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload),
        });

        const result = await res.json();
        setLoading(false);

        if (result.success) {
            showModal({
                type: "success",
                title: "¡Alta confirmada!",
                message: "El cliente ha sido asociado al convenio correctamente.",
            });
            form.reset();
        } else if (result.errorType === "DUPLICATE_DNI") {
            showModal({
                type: "error",
                title: "¡DNI Ya registrado!",
                message: "Este DNI ya existe en la base de datos de Super Europa.",
            });
        } else {
            showModal({
                type: "error",
                title: "Error al registrar",
                message: result.message || "Error al completar el registro.",
            });
        }
    } catch (err) {
        setLoading(false);
        showModal({
            type: "error",
            title: "Error de conexión",
            message: "No se pudo conectar con los servidores.",
        });
    }
});

// ─── Solo números en DNI ──────────────────────────────────────
document.getElementById("dni").addEventListener("input", function () {
    this.value = this.value.replace(/[^\d]/g, "");
});
