// ============================================================
//  SUPER EUROPA — Lógica del formulario de clientes
// ============================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYUgu2iKe0q3B7pregt7vdssFR0m1XMHcmNtBYEgeY_enecmIrQucfjbiYNLbgpouW/exec";

// ─── DOM refs ────────────────────────────────────────────────
const form          = document.getElementById("clientForm");
const btnSubmit     = document.getElementById("btnSubmit");
const loadingOverlay = document.getElementById("loadingOverlay");
const modalOverlay  = document.getElementById("modalOverlay");
const modalIcon     = document.getElementById("modalIcon");
const modalTitle    = document.getElementById("modalTitle");
const modalMsg      = document.getElementById("modalMsg");
const modalErrors   = document.getElementById("modalErrors");
const modalBtn      = document.getElementById("modalBtn");

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
    modalBtn.textContent = type === "success" ? "¡Listo!" : "Entendido";

    modalOverlay.classList.add("active");
}

function closeModal() {
    modalOverlay.classList.remove("active");
}

// ─── Obtener checkboxes marcados ──────────────────────────────
function getChecked(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value);
}

// ─── Obtener radio seleccionado ───────────────────────────────
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
        errors.push("El número de celular es obligatorio.");
    } else if (!/^\d{7,15}$/.test(data.celular.trim().replace(/[\s\-+]/g, ""))) {
        errors.push("El número de celular no es válido.");
    }

    if (!data.pregunta1.length)
        errors.push("Seleccioná al menos una opción en la pregunta 1.");

    if (!data.pregunta2.length)
        errors.push("Seleccioná al menos una opción en la pregunta 2.");

    if (!data.pregunta3.length)
        errors.push("Seleccioná al menos una opción en la pregunta 3.");

    if (!data.pregunta4)
        errors.push("Seleccioná una sucursal en la pregunta 4.");

    return errors;
}

// ─── Submit ───────────────────────────────────────────────────
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = {
        nombre:      document.getElementById("nombre").value.trim(),
        dni:         document.getElementById("dni").value.trim(),
        celular:     document.getElementById("celular").value.trim(),
        fechaNac:    document.getElementById("fechaNac").value.trim(),
        domicilio:   document.getElementById("domicilio").value.trim(),
        pregunta1:   getChecked("p1"),
        pregunta2:   getChecked("p2"),
        pregunta3:   getChecked("p3"),
        pregunta4:   getRadio("p4"),          // radio → string único
        comentarios: document.getElementById("comentarios").value.trim(),
    };

    // Validación client-side
    const errors = validate(data);
    if (errors.length) {
        showModal({
            type: "error",
            title: "Revisá el formulario",
            message: "Por favor corregí los siguientes errores antes de enviar:",
            errors
        });
        return;
    }

    // Verificar URL configurada
    if (APPS_SCRIPT_URL === "PEGAR_URL_AQUI") {
        showModal({
            type: "error",
            title: "Configuración pendiente",
            message: "El formulario aún no está conectado al servidor. Configurá la URL del Apps Script.",
        });
        return;
    }

    // Armar payload
    const payload = {
        nombre:      data.nombre,
        dni:         data.dni.replace(/\./g, ""),
        celular:     data.celular,
        fechaNac:    data.fechaNac,
        domicilio:   data.domicilio,
        pregunta1:   data.pregunta1.join(", "),
        pregunta2:   data.pregunta2.join(", "),
        pregunta3:   data.pregunta3.join(", "),
        pregunta4:   data.pregunta4,           // string, no necesita join
        comentarios: data.comentarios,
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
                title: "¡Registro exitoso!",
                message: "¡Bienvenido/a a la comunidad Super Europa! Ya sos parte de nuestra familia de clientes.",
            });
            form.reset();
        } else if (result.errorType === "DUPLICATE_DNI") {
            showModal({
                type: "error",
                title: "¡Ya sos parte!",
                message: "El DNI ingresado ya está registrado. ¡Ya sos parte de la comunidad Super Europa! 🎉",
            });
        } else {
            showModal({
                type: "error",
                title: "Error al registrar",
                message: result.message || "Ocurrió un error inesperado. Intentá de nuevo en unos momentos.",
            });
        }
    } catch (err) {
        setLoading(false);
        showModal({
            type: "error",
            title: "Error de conexión",
            message: "No pudimos conectar con el servidor. Verificá tu conexión a internet e intentá de nuevo.",
        });
    }
});

// ─── Solo números en DNI ──────────────────────────────────────
document.getElementById("dni").addEventListener("input", function () {
    this.value = this.value.replace(/[^\d]/g, "");
});