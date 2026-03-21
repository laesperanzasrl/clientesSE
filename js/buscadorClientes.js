const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYUgu2iKe0q3B7pregt7vdssFR0m1XMHcmNtBYEgeY_enecmIrQucfjbiYNLbgpouW/exec";
const SECRET_PASS = "super123"; // Debe coincidir con el backend

let allClients = [];
let conveniosMap = {};

const searchInput = document.getElementById("searchInput");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const emptyState = document.getElementById("emptyState");
const tableContainer = document.getElementById("tableContainer");
const tableBody = document.getElementById("tableBody");
const errorText = document.getElementById("errorText");

// Formatear Fecha
function formatDate(isoString) {
    if (!isoString) return "-";
    // Si viene solo como texto de Sheets:
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

// Inicializar la carga
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const url = `${APPS_SCRIPT_URL}?action=buscar&pass=${SECRET_PASS}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === "OK") {
            // Mapear los convenios para fácil acceso
            if (data.conveniosDetalles) {
                data.conveniosDetalles.forEach(conv => {
                    const nombre = conv["NOMBRE ENTIDAD / COMERCIO"];
                    if (nombre) {
                        conveniosMap[nombre.toString().trim().toUpperCase()] = conv;
                    }
                });
            }

            // Guardar clientes
            allClients = data.clientes || [];

            // Ocultar carga, mostrar input
            loadingState.style.display = "none";
            searchInput.disabled = false;
            searchInput.focus();

            // Render inicial (todo)
            renderTable(allClients);
        } else {
            throw new Error(data.message || "Credenciales inválidas o error de servidor");
        }
    } catch (err) {
        loadingState.style.display = "none";
        errorState.style.display = "flex";
        errorText.textContent = "Error al cargar la base de datos: " + err.message;
        console.error(err);
    }
});

// Evento de búsqueda en tiempo real
searchInput.addEventListener("keyup", (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query === "") {
        renderTable(allClients);
        return;
    }

    const filtered = allClients.filter(c => {
        // En tu Apps Script, asegúrate de que respeten estos nombres de columna 
        // o asume índices/nombres que tengas en sheets.
        // Si el JSON trae arrays en vez de objetos nombrados, deberías acceder por índice, 
        // pero hemos armado el Apps Script para que devuelva objetos mediante las cabeceras.

        const nombreStr = (c["NOMBRE Y APELLIDO"] || "").toString().toLowerCase();
        const dniStr = (c["DNI"] || "").toString().toLowerCase();

        return nombreStr.includes(query) || dniStr.includes(query);
    });

    renderTable(filtered);
});

// Renderizar la tabla
function renderTable(clientes) {
    tableBody.innerHTML = "";

    if (clientes.length === 0) {
        tableContainer.style.display = "none";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    tableContainer.style.display = "block";

    clientes.forEach(c => {
        const id = c["ID CLIENTE"] || "-";
        const nombre = c["NOMBRE Y APELLIDO"] || "Sin Nombre";
        const dni = c["DNI"] || "-";
        const tel = c["TELEFONO/CELULAR"] || "-";
        const fecha = formatDate(c["FECHA DE NACIMIENTO"]);
        const domicilio = c["DOMICILIO"] || "-";

        const convenioVal = (c["CONVENIO"] || "").toString().trim();
        const upperConv = convenioVal.toUpperCase();

        // Excluir si dicen explícitamente que no tienen
        const sinConvenioStrs = ["NO PERTENEZCO A NINGUNO", "NINGUNO", "NO", "SIN CONVENIO", ""];
        const isSinConvenio = sinConvenioStrs.includes(upperConv);

        let convenioHTML = `<span class="conv-none">Sin convenio</span>`;
        let detallesHTML = "";
        let hasDetails = false;

        if (!isSinConvenio) {
            const convData = conveniosMap[upperConv];
            if (convData) {
                hasDetails = true;
                
                let porcentaje = convData["%"];
                if (!porcentaje) {
                    porcentaje = "-";
                } else {
                    let num = parseFloat(porcentaje);
                    // Si llega de Sheets como decimal (ej: 0.08) lo pasamos a 8
                    if (!isNaN(num) && num > 0 && num <= 1 && String(porcentaje).includes(".")) {
                        porcentaje = Math.round(num * 100);
                    }
                }

                // Asegurar que tenga el símbolo de porcentaje para que se vea bien
                let porcentajeText = String(porcentaje);
                if (porcentajeText !== "-" && !porcentajeText.includes("%")) {
                    porcentajeText += "%";
                }
                
                convenioHTML = `
                    <div class="conv-badge">
                        <span class="conv-name">${convenioVal}</span>
                        <span class="conv-detail">${porcentajeText} OFF</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                `;
                
                detallesHTML = `
                    <div class="details-grid">
                        <div class="d-item"><strong>Entidad:</strong> ${convData["NOMBRE ENTIDAD / COMERCIO"] || "-"}</div>
                        <div class="d-item"><strong>Descuento:</strong> ${porcentajeText}</div>
                        <div class="d-item"><strong>Días válidos:</strong> ${convData["DÍAS"] || "-"}</div>
                        <div class="d-item"><strong>Medio de pago:</strong> ${convData["MEDIO DE PAGO"] || "-"}</div>
                        <div class="d-item"><strong>Monto mín.:</strong> ${convData["MONTO MÍN."] || "-"}</div>
                        <div class="d-item"><strong>Credencial / Notas:</strong> ${convData["CREDENCIAL / NOTAS"] || "-"}</div>
                    </div>
                `;
            } else {
                convenioHTML = `
                    <div class="conv-badge">
                        <span class="conv-name">${convenioVal}</span>
                    </div>
                `;
            }
        }

        const tr = document.createElement("tr");
        if (hasDetails) {
            tr.classList.add("has-details");
            tr.title = "Haz clic para ver los detalles del convenio";
            tr.onclick = () => {
                tr.classList.toggle("opened");
                const next = tr.nextElementSibling;
                if (next && next.classList.contains("details-row")) {
                    if (next.style.display === "none") {
                        next.style.display = "table-row";
                    } else {
                        next.style.display = "none";
                    }
                }
            };
        }

        tr.innerHTML = `
            <td>#${id}</td>
            <td><span class="primary-text">${nombre}</span></td>
            <td><span class="td-dni">${dni}</span></td>
            <td>${tel}</td>
            <td>${fecha}</td>
            <td>${domicilio}</td>
            <td>${convenioHTML}</td>
        `;
        tableBody.appendChild(tr);

        // Fila extra oculta para acordeón
        if (hasDetails) {
            const trDet = document.createElement("tr");
            trDet.className = "details-row";
            trDet.style.display = "none";
            trDet.innerHTML = `
                <td colspan="7">
                    <div class="details-box">
                        ${detallesHTML}
                    </div>
                </td>
            `;
            tableBody.appendChild(trDet);
        }
    });
}
