const sheetURL = "https://docs.google.com/spreadsheets/d/16GrCbqMK0kC2Dma3reW1s8b1CkcC2Nt9Y-FZcExqC48/gviz/tq?tqx=out:csv";
let data = [];
let puntosActuales = 0;
let carrito = [];

// Cargar datos de Google Sheets
async function fetchData() {
    try {
        const response = await fetch(sheetURL);
        const text = await response.text();
        const rows = text.split("\n").map((row) => row.split(","));
        const headers = rows[0].map((h) => h.trim());

        data = rows.slice(1).map((row) => {
            let obj = {};
            row.forEach((col, i) => (obj[headers[i]] = col.trim()));
            return obj;
        });
        
        data = data.map(item => {
            const cleanItem = {};
            for (const key in item) {
                const cleanKey = key.replace(/"/g, '');
                const cleanValue = item[key].replace(/"/g, '');
                cleanItem[cleanKey] = cleanValue;
            }
            return cleanItem;
        });
        
        console.log("Datos cargados:", data);
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

function buscarPuntos() {
    const correoInput = document.getElementById('correo');
    if (!correoInput) {
        console.error('Elemento correo no encontrado');
        return;
    }
    const correo = correoInput.value.toLowerCase();
    
    if (correo === "") {
        document.getElementById('mensajeBienvenida').style.display = 'none';
        puntosActuales = 0;
        return;
    }

    const result = data.find((item) => {
        return item && item.Correo && item.Correo.toLowerCase() === correo;
    });

    if (result) {
        puntosActuales = parseInt(result.Puntos.trim()) || 0;
        console.log(`Puntos cargados: ${puntosActuales}`);
        let fotoURL = "img/Sentado.PNG";
        
        // Mostrar todos los datos del usuario
        const nombreElement = document.getElementById('nombreUsuario');
        if (nombreElement) {
            nombreElement.textContent = result.Nombre || '-';
        }
        const puntosElement = document.getElementById('puntosUsuario');
        if (puntosElement) {
            puntosElement.textContent = puntosActuales;
        }
        const fotoElement = document.getElementById('fotoUsuario');
        if (fotoElement) {
            fotoElement.src = fotoURL;
        }
        
        // Mostrar el contenedor de bienvenida
        document.getElementById('mensajeBienvenida').style.display = 'block';
        
        console.log(`Datos encontrados:`, result);
    } else {
        document.getElementById('mensajeBienvenida').style.display = 'none';
        Swal.fire({
            icon: 'error',
            title: 'No encontrado',
            text: 'El correo no está registrado en nuestra base de datos'
        });
        puntosActuales = 0;
        console.log("Correo no encontrado");
    }
}

// Funciones del Carrito
function agregarAlCarrito(nombre, precio, imagen, inputId) {
    if (!document.getElementById('correo').value) {
        Swal.fire({
            icon: 'warning',
            title: 'Ingresa tu correo',
            text: 'Debes ingresar tu correo antes de agregar items al carrito.'
        });
        return;
    }

    // Obtener el input element usando el ID
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
        console.error(`No se encontró el input con ID: ${inputId}`);
        return;
    }

    // Obtener la cantidad del input
    const cantidad = parseInt(inputElement.value) || 1;

    if (cantidad <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cantidad inválida',
            text: 'La cantidad debe ser mayor a 0.'
        });
        return;
    }

    // Agregar el producto al carrito 'cantidad' veces
    for (let i = 0; i < cantidad; i++) {
        carrito.push({
            nombre: nombre,
            precio: precio,
            imagen: imagen,
            id: Date.now() + i
        });
    }

    actualizarVistaCarrito();
    
    // Mostrar notificación
    Swal.fire({
        title: '✅ Agregado al carrito',
        text: `${cantidad} x ${nombre} se agregó al carrito`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });

    // Restablecer el input a 1
    inputElement.value = 1;
}

function removerDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const carritoContainer = document.getElementById('carritoItems');
    const totalCarrito = document.getElementById('totalCarrito');

    if (carrito.length === 0) {
        carritoContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Tu carrito está vacío</p>';
        totalCarrito.textContent = '0 🍭';
        return;
    }

    let html = '';
    let total = 0;

    carrito.forEach(item => {
        total += item.precio;
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #e0e0e0; gap: 15px;">
                <img src="${item.imagen}" alt="${item.nombre}" style="width: 60px; height: 60px; object-fit: contain;">
                <div style="flex-grow: 1;">
                    <p style="margin: 0; font-weight: bold; color: #333;">${item.nombre}</p>
                    <p style="margin: 0; color: #fe97a4; font-weight: bold;">${item.precio} 🍭</p>
                </div>
                <button onclick="removerDelCarrito(${item.id})" style="background: #ff6b6b; border: none; color: white; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: bold;">✕</button>
            </div>
        `;
    });

    carritoContainer.innerHTML = html;
    totalCarrito.textContent = total + ' 🍭';
}

function limpiarCarrito() {
    if (carrito.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Carrito vacío',
            text: 'No hay items para eliminar'
        });
        return;
    }

    Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Deseas vaciar todo el carrito?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar'
    }).then(result => {
        if (result.isConfirmed) {
            carrito = [];
            actualizarVistaCarrito();
            Swal.fire({
                title: '✅ Carrito vaciado',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

function comprarCarrito() {
    const correo = document.getElementById('correo').value;

    if (!correo) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa tu correo.'
        });
        return;
    }

    if (carrito.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Carrito vacío',
            text: 'Agrega productos antes de comprar.'
        });
        return;
    }

    // Verificar que el correo esté registrado
    const usuarioRegistrado = data.find((item) => {
        return item && item.Correo && item.Correo.toLowerCase() === correo.toLowerCase();
    });

    if (!usuarioRegistrado) {
        Swal.fire({
            icon: 'error',
            title: 'Correo no encontrado',
            text: 'Tu correo no está registrado en la base de datos.'
        });
        return;
    }

    // Calcular total
    const totalCompra = carrito.reduce((sum, item) => sum + item.precio, 0);

    if (puntosActuales < totalCompra) {
        Swal.fire({
            icon: 'error',
            title: 'Puntos insuficientes',
            text: `Necesitas ${totalCompra} puntos pero solo tienes ${puntosActuales}.`
        });
        return;
    }

    // Crear resumen de compra
    const resumenItems = carrito.map(item => `${item.nombre}(${item.precio}pts)`).join(', ');

    solicitarModoEntrega().then((entregaSeleccionada) => {
        if (!entregaSeleccionada) {
            return;
        }

        Swal.fire({
            title: '¿Confirmar canjeo?',
            html: `
                <p><strong>Correo:</strong> ${correo}</p>
                <p><strong>Modo de entrega:</strong> ${entregaSeleccionada}</p>
                <hr>
                <div style="text-align: left; margin: 15px 0;">
                    ${carrito.map(item => `<p style="margin: 8px 0;"><strong>${item.nombre}</strong> - ${item.precio} 🍭</p>`).join('')}
                </div>
                <hr>
                <p><strong>Total a gastar:</strong> ${totalCompra} puntos</p>
                <p><strong>Puntos restantes:</strong> ${puntosActuales - totalCompra} puntos</p>
            `,
            imageUrl: 'img/escondido.jpg',
            imageAlt: 'Confirmar canjeo',
            imageWidth: 120,
            imageHeight: 120,
            showCancelButton: true,
            confirmButtonText: 'Confirmar canjeo',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                procesarCompraCarrito(correo, totalCompra, resumenItems, entregaSeleccionada);
            }
        });
    });
}

function solicitarModoEntrega() {
    return Swal.fire({
        title: 'Modo de entrega',
        html: `
            <p style="margin-bottom: 12px;"><strong>¿Cómo preferís recibir tus objetos?</strong></p>
            <select id="modoEntrega" class="swal2-input" style="margin: 0 auto;">
                <option value="">Selecciona una opción</option>
                <option value="Futura reunión">A. Futura reunión</option>
                <option value="Presencial en San José centro">B. Presencial en San José centro</option>
                <option value="Por envíos">C. Por envíos</option>
                <option value="Otro metodo">D. Otro metodo</option>
            </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: () => {
            const selectEntrega = document.getElementById('modoEntrega');
            const modo = selectEntrega.value;

            if (!modo) {
                Swal.showValidationMessage('Selecciona un modo de entrega.');
                return false;
            }
            return modo;
        }
    }).then((result) => {
        if (!result.isConfirmed) {
            return null;
        }

        if (result.value !== 'Otro metodo') {
            return result.value;
        }

        return Swal.fire({
            title: 'D. Otro método',
            input: 'text',
            inputPlaceholder: 'Escribe aquí cómo querés recibir tu paquete',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!String(value || '').trim()) {
                    return 'Digita el detalle en la opción D. Otro método.';
                }
                return null;
            }
        }).then((otroResult) => {
            if (!otroResult.isConfirmed) {
                return null;
            }
            return `Otro método: ${String(otroResult.value || '').trim()}`;
        });
    });
}

function procesarCompraCarrito(correo, totalCompra, resumenItems, entregaSeleccionada) {
    const puntosNum = parseInt(puntosActuales) || 0;
    const gastosNum = parseInt(totalCompra) || 0;
    const nuevosPuntos = Math.max(0, puntosNum - gastosNum);

    // URL del Google Apps Script
    const appsScriptURL = "https://script.google.com/macros/s/AKfycbwx69HFoYUle-MkzX3z9zORKrrXPJwrJq4C3f49p2EhxPko2Mkea4txdJn-d4gVan5G/exec";

    // Enviar datos a Google Sheet
    fetch(appsScriptURL, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({
            correo: correo,
            gasto: String(-Number(totalCompra)),
            compras: resumenItems,
            entrega: entregaSeleccionada
        })
    })
    .then(() => {
        // Mostrar confirmación de canjeo exitoso
        Swal.fire({
            title: '¡Canjeo realizado!',
            html: `
                <p>Gracias por tu canjeo, <strong>${correo}</strong>.</p>
                <p><strong>Entrega:</strong> ${entregaSeleccionada}</p>
                <p><strong>Artículos:</strong><br>${carrito.map(item => `${item.nombre} (${item.precio}🍭)`).join('<br>')}</p>
                <p><strong>Puntos gastados:</strong> ${totalCompra}</p>
                <p><strong>Puntos restantes:</strong> <strong>${nuevosPuntos}</strong></p>
                <p style="color: green; font-weight: bold;">✓ Actualizado en la base de datos</p>
            `,
            icon: 'success'
        }).then(() => {
            // Actualizar los puntos en la interfaz
            puntosActuales = nuevosPuntos;
            
            const puntosElement = document.getElementById('puntosUsuario');
            if (puntosElement) {
                puntosElement.textContent = nuevosPuntos;
            }

            // Limpiar el carrito
            carrito = [];
            actualizarVistaCarrito();

            console.log(`Canjeo registrado en la base de datos para ${correo}`);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor. Intenta de nuevo.'
        });
    });
}

// Cargar datos al iniciar
fetchData();
