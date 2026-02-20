const sheetURL = "https://docs.google.com/spreadsheets/d/16GrCbqMK0kC2Dma3reW1s8b1CkcC2Nt9Y-FZcExqC48/gviz/tq?tqx=out:csv";
const inventarioSheetURL = "https://docs.google.com/spreadsheets/d/16GrCbqMK0kC2Dma3reW1s8b1CkcC2Nt9Y-FZcExqC48/gviz/tq?tqx=out:csv&sheet=Inventario";
let data = [];
let puntosActuales = 0;
let carrito = [];
let STOCK_LIMITES = {
    'Calendario': 5
};

let vendidosPorProducto = {};

function normalizarNombreProducto(nombre) {
    return String(nombre || '').trim().toLowerCase();
}

function obtenerClaveStock(nombre) {
    const objetivo = normalizarNombreProducto(nombre);
    const claveEncontrada = Object.keys(STOCK_LIMITES).find(
        (clave) => normalizarNombreProducto(clave) === objetivo
    );
    return claveEncontrada || nombre;
}

function cantidadVendida(nombre) {
    const clave = obtenerClaveStock(nombre);
    return vendidosPorProducto[clave] || 0;
}

function cantidadEnCarrito(nombre) {
    const objetivo = normalizarNombreProducto(nombre);
    return carrito.filter(item => normalizarNombreProducto(item.nombre) === objetivo).length;
}

function cantidadDisponible(nombre) {
    const clave = obtenerClaveStock(nombre);
    const limite = STOCK_LIMITES[clave];
    if (typeof limite !== 'number') {
        return Infinity;
    }
    return Math.max(0, limite - cantidadVendida(clave) - cantidadEnCarrito(clave));
}

function productoAgotado(nombre) {
    const clave = obtenerClaveStock(nombre);
    const limite = STOCK_LIMITES[clave];
    if (typeof limite !== 'number') {
        return false;
    }
    return cantidadVendida(clave) >= limite;
}

function obtenerNombreProductoDesdeBoton(boton) {
    const onclick = boton.getAttribute('onclick') || '';

    const dinamico = onclick.match(/agregarAlCarrito\('([^']*)'\s*\+\s*document\.getElementById\('([^']+)'\)\.value/);
    if (dinamico) {
        const prefijo = dinamico[1];
        const selectId = dinamico[2];
        const select = document.getElementById(selectId);
        if (!select) {
            return null;
        }
        return `${prefijo}${select.value}`.trim();
    }

    const fijo = onclick.match(/agregarAlCarrito\('([^']+)'/);
    if (fijo) {
        return fijo[1];
    }

    return null;
}

function obtenerSelectIdDesdeBoton(boton) {
    const onclick = boton.getAttribute('onclick') || '';
    const dinamico = onclick.match(/agregarAlCarrito\('([^']*)'\s*\+\s*document\.getElementById\('([^']+)'\)\.value/);
    if (!dinamico) {
        return null;
    }
    return dinamico[2];
}

function actualizarDisponibilidadCards() {
    const botones = document.querySelectorAll("button[onclick*='agregarAlCarrito(']");

    botones.forEach((boton) => {
        const nombreProducto = obtenerNombreProductoDesdeBoton(boton);
        const onclick = boton.getAttribute('onclick') || '';
        const dinamico = onclick.match(/agregarAlCarrito\('([^']*)'\s*\+\s*document\.getElementById\('([^']+)'\)\.value/);

        if (!nombreProducto) {
            return;
        }

        const agotado = productoAgotado(nombreProducto);
        boton.disabled = agotado;
        boton.textContent = agotado ? 'No disponible' : 'Agregar';
        boton.style.opacity = agotado ? '0.65' : '1';
        boton.style.cursor = agotado ? 'not-allowed' : 'pointer';

        const selectId = obtenerSelectIdDesdeBoton(boton);
        if (selectId) {
            const select = document.getElementById(selectId);
            if (select) {
                select.classList.remove('select-no-disponible');

                Array.from(select.options).forEach((option) => {
                    option.classList.remove('option-no-disponible');
                    if (dinamico) {
                        const prefijo = dinamico[1];
                        const nombreOpcion = `${prefijo}${option.value}`.trim();
                        if (productoAgotado(nombreOpcion)) {
                            option.classList.add('option-no-disponible');
                        }
                    }
                });
            }
        }
    });
}

async function fetchInventario() {
    try {
        const response = await fetch(inventarioSheetURL);
        const text = await response.text();
        const rows = text
            .split("\n")
            .map((row) => row.split(",").map((cell) => cell.trim().replace(/"/g, '')))
            .filter((row) => row.length > 0 && row.some((cell) => cell !== ''));

        if (rows.length < 2) {
            actualizarDisponibilidadCards();
            return;
        }

        const headers = rows[0].map((h) => h.toLowerCase());
        const idxProducto = headers.indexOf('producto');
        const idxStock = headers.indexOf('stock');
        const idxVendido = headers.findIndex((h) => h === 'vendido' || h === 'se vendio' || h === 'se_vendio' || h === 'sevendio');

        if (idxProducto === -1 || idxStock === -1) {
            console.warn('La hoja Inventario debe tener columnas: Producto, Stock, Vendido');
            actualizarDisponibilidadCards();
            return;
        }

        const nuevoStock = {};
        const nuevoVendido = {};

        rows.slice(1).forEach((row) => {
            const producto = (row[idxProducto] || '').trim();
            const stock = parseInt((row[idxStock] || '').trim(), 10);
            const vendido = idxVendido >= 0 ? parseInt((row[idxVendido] || '').trim(), 10) : 0;

            if (!producto || Number.isNaN(stock) || stock < 0) {
                return;
            }

            nuevoStock[producto] = stock;
            nuevoVendido[producto] = Number.isNaN(vendido) || vendido < 0 ? 0 : vendido;
        });

        if (Object.keys(nuevoStock).length > 0) {
            STOCK_LIMITES = nuevoStock;
            vendidosPorProducto = nuevoVendido;
        }

        actualizarDisponibilidadCards();
    } catch (error) {
        console.warn('No se pudo cargar Inventario desde Excel. Usando stock por defecto.', error);
        actualizarDisponibilidadCards();
    }
}

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
        
        const nombreElement = document.getElementById('nombreUsuario');
        if (nombreElement) {
            nombreElement.textContent = result.Nombre || '-';
        }
        const puntosElement = document.getElementById('puntosUsuario');
        if (puntosElement) {
            puntosElement.textContent = puntosActuales;
        }
        
        document.getElementById('mensajeBienvenida').style.display = 'block';
    } else {
        document.getElementById('mensajeBienvenida').style.display = 'none';
        Swal.fire({
            icon: 'error',
            title: 'No encontrado',
            text: 'El correo no está registrado en nuestra base de datos'
        });
        puntosActuales = 0;
    }
}

// Funciones del Carrito
function obtenerImagenDesdeCard(imagenActual) {
    if (imagenActual && imagenActual !== 'img/merch.png') {
        return imagenActual;
    }

    const elementoActivo = document.activeElement;
    if (!elementoActivo || !elementoActivo.closest) {
        return imagenActual;
    }

    const card = elementoActivo.closest('.card');
    if (!card) {
        return imagenActual;
    }

    const imagenCard = card.querySelector('img.product-image');
    if (!imagenCard) {
        return imagenActual;
    }

    return imagenCard.getAttribute('src') || imagenActual;
}

function agregarAlCarrito(nombre, precio, imagen, inputId) {
    if (!document.getElementById('correo').value) {
        Swal.fire({
            icon: 'warning',
            title: 'Ingresa tu correo',
            text: 'Debes ingresar tu correo antes de agregar items al carrito.'
        });
        return;
    }

    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
        console.error(`No se encontró el input con ID: ${inputId}`);
        return;
    }

    const cantidad = parseInt(inputElement.value) || 1;

    if (cantidad <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cantidad inválida',
            text: 'La cantidad debe ser mayor a 0.'
        });
        return;
    }

    let cantidadAgregar = cantidad;
    const claveStock = obtenerClaveStock(nombre);
    const limite = STOCK_LIMITES[claveStock];
    if (typeof limite === 'number') {
        const disponibles = cantidadDisponible(claveStock);

        if (disponibles <= 0) {
            Swal.fire({
                icon: 'info',
                title: 'No disponible',
                text: `${nombre} ya no tiene unidades disponibles.`
            });
            actualizarDisponibilidadCards();
            return;
        }

        if (cantidad > disponibles) {
            cantidadAgregar = disponibles;
            Swal.fire({
                icon: 'warning',
                title: 'Stock limitado',
                text: `Solo quedan ${disponibles} unidades de ${nombre}. Se agregarán esas unidades.`
            });
        }
    }

    const imagenProducto = obtenerImagenDesdeCard(imagen);

    for (let i = 0; i < cantidadAgregar; i++) {
        carrito.push({
            nombre: nombre,
            precio: precio,
            imagen: imagenProducto,
            id: Date.now() + i
        });
    }

    actualizarVistaCarrito();
    
    Swal.fire({
        title: '✅ Agregado al carrito',
        text: `${cantidadAgregar} x ${nombre} se agregó al carrito`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });

    inputElement.value = 1;
}

function removerDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const carritoContainer = document.getElementById('carritoItems');
    const totalCarrito = document.getElementById('totalCarrito');
    const cartBadge = document.getElementById('cartBadge');

    // Actualizar badge del carrito flotante
    if (carrito.length > 0) {
        cartBadge.style.display = 'flex';
        cartBadge.textContent = carrito.length;
    } else {
        cartBadge.style.display = 'none';
    }

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

function obtenerCantidadesCarrito() {
    return carrito.reduce((acc, item) => {
        const clave = obtenerClaveStock(item.nombre);
        acc[clave] = (acc[clave] || 0) + 1;
        return acc;
    }, {});
}

// Funciones para abrir/cerrar el modal del carrito
function abrirCarrito() {
    document.getElementById('cartModal').style.display = 'block';
}

function cerrarCarrito() {
    document.getElementById('cartModal').style.display = 'none';
}

function cerrarCarritoFondo(event) {
    if (event.target.id === 'cartModal') {
        cerrarCarrito();
    }
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

    const totalCompra = carrito.reduce((sum, item) => sum + item.precio, 0);
    const cantidadesPorProducto = obtenerCantidadesCarrito();

    for (const [nombreProducto, cantidad] of Object.entries(cantidadesPorProducto)) {
        const limite = STOCK_LIMITES[nombreProducto];
        if (typeof limite !== 'number') {
            continue;
        }

        const vendidos = cantidadVendida(nombreProducto);
        const disponiblesAntesDeComprar = Math.max(0, limite - vendidos);

        if (cantidad > disponiblesAntesDeComprar) {
            Swal.fire({
                icon: 'error',
                title: 'Stock insuficiente',
                text: `Solo quedan ${disponiblesAntesDeComprar} unidades de ${nombreProducto}.` 
            });
            actualizarDisponibilidadCards();
            return;
        }
    }

    if (puntosActuales < totalCompra) {
        Swal.fire({
            icon: 'error',
            title: 'Puntos insuficientes',
            text: `Necesitas ${totalCompra} puntos pero solo tienes ${puntosActuales}.`
        });
        return;
    }

    const resumenItems = carrito.map(item => `${item.nombre}(${item.precio}pts)`).join(', ');

    solicitarModoEntrega().then((entregaSeleccionada) => {
        if (!entregaSeleccionada) {
            return;
        }

        Swal.fire({
            title: '¿Confirmar compra?',
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
            imageAlt: 'Confirmar compra',
            imageWidth: 120,
            imageHeight: 120,
            showCancelButton: true,
            confirmButtonText: 'Confirmar compra',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                procesarCompraCarrito(correo, totalCompra, resumenItems, cantidadesPorProducto, entregaSeleccionada);
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
            title: 'D. Otro metodo',
            input: 'text',
            inputPlaceholder: 'Escribe aquí cómo querés recibir tu paquete',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!String(value || '').trim()) {
                    return 'Digita el detalle en la opción D. Otro metodo.';
                }
                return null;
            }
        }).then((otroResult) => {
            if (!otroResult.isConfirmed) {
                return null;
            }
            return `Otro metodo: ${String(otroResult.value || '').trim()}`;
        });
    });
}

function procesarCompraCarrito(correo, totalCompra, resumenItems, cantidadesPorProducto, entregaSeleccionada) {
    const puntosNum = parseInt(puntosActuales) || 0;
    const gastosNum = parseInt(totalCompra) || 0;
    const nuevosPuntos = Math.max(0, puntosNum - gastosNum);

    const appsScriptURL = "https://script.google.com/macros/s/AKfycbwx69HFoYUle-MkzX3z9zORKrrXPJwrJq4C3f49p2EhxPko2Mkea4txdJn-d4gVan5G/exec";

    // Mostrar popup de espera
    Swal.fire({
        title: 'Procesando compra...',
        html: '<div style="text-align: center;">'
            + '<img src="img/corriendo.gif" alt="Procesando" style="width: 120px; height: auto; display: block; margin: 0 auto 10px;">'
            + '<div class="loading-dots" style="margin: 10px 0 0;">'
            + '<span></span><span></span><span></span>'
            + '</div>'
            + '<p style="margin-top: 16px; color: #666;">Por favor espera mientras procesamos tu compra</p>'
            + '</div>',
        icon: null,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            // Agregar animación CSS si no existe
            if (!document.getElementById('spinnerStyle')) {
                const style = document.createElement('style');
                style.id = 'spinnerStyle';
                style.textContent = '.loading-dots{display:inline-flex;gap:10px;align-items:center;justify-content:center;}'
                    + '.loading-dots span{width:12px;height:12px;border-radius:50%;background:#fe97a4;display:inline-block;animation:dotPulse 1s infinite ease-in-out;}'
                    + '.loading-dots span:nth-child(2){animation-delay:0.15s;}'
                    + '.loading-dots span:nth-child(3){animation-delay:0.3s;}'
                    + '@keyframes dotPulse{0%,80%,100%{transform:scale(0.6);opacity:0.5;}40%{transform:scale(1);opacity:1;}}';
                document.head.appendChild(style);
            }
        }
    });

    // Hacer el fetch
    fetch(appsScriptURL, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({
            correo: correo,
            gasto: String(-Number(totalCompra)),
            compras: resumenItems,
            entrega: entregaSeleccionada,
            vendidos: JSON.stringify(cantidadesPorProducto),
            inventarioSheet: 'Inventario',
            inventarioColumnaVendido: 'Vendido'
        })
    })
    .then(() => {
        // Esperar un momento corto para mostrar el estado de procesamiento
        return new Promise(resolve => setTimeout(resolve, 600));
    })
    .then(() => {
        Object.entries(cantidadesPorProducto).forEach(([nombre, cantidad]) => {
            if (typeof STOCK_LIMITES[nombre] === 'number') {
                vendidosPorProducto[nombre] = (vendidosPorProducto[nombre] || 0) + cantidad;
            }
        });

        actualizarDisponibilidadCards();

        const itemsHtml = carrito
            .map(item => `${item.nombre} (${item.precio}🍭)`)
            .join('<br>');

        // Actualizar los puntos
        puntosActuales = nuevosPuntos;
        
        const puntosElement = document.getElementById('puntosUsuario');
        if (puntosElement) {
            puntosElement.textContent = nuevosPuntos;
        }

        // Cerrar el modal del carrito
        cerrarCarrito();

        // Mostrar popup de éxito
        Swal.fire({
            title: '¡Compra realizada!',
            html: `
                <p>Gracias por tu compra, <strong>${correo}</strong>.</p>
                <p><strong>Entrega:</strong> ${entregaSeleccionada}</p>
                <p><strong>Artículos:</strong><br>${itemsHtml}</p>
                <p><strong>Puntos gastados:</strong> ${totalCompra}</p>
                <p><strong>Puntos restantes:</strong> <strong>${nuevosPuntos}</strong></p>
                <p style="color: green; font-weight: bold;">✓ Actualizado en la base de datos</p>
            `,
            icon: 'success'
        });

        carrito = [];
        actualizarVistaCarrito();
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
const pcsImagenes = {
            'nayeon': 'img/pcs/nayeon.webp',
            'jeongyeon': 'img/pcs/jeongyeon.webp',
            'momo': 'img/pcs/momo.jpeg',
            'sana': 'img/pcs/sana.webp',
            'jihyo': 'img/pcs/Copia de jihyo.jpeg',
            'mina': 'img/pcs/mina.webp',
            'dahyun': 'img/pcs/Dahyun.webp',
            'chaeyoung': 'img/pcs/Chaeyoung.png',
            'tzuyu': 'img/pcs/tuzyu.webp'
        };

const postersImagenes = {
            'nayeon': 'img/posters/Nayeon.JPG',
            'jeongyeon': 'img/posters/Jeongyeon.JPG',
            'momo': 'img/posters/Momo.JPG',
            'sana': 'img/posters/Sana.JPG',
            'jihyo': 'img/posters/Jihyo.JPG',
            'mina': 'img/posters/Mina.JPG',
            'dahyun': 'img/posters/Dahyun.JPG',
            'chaeyoung': 'img/posters/Chaeyoung.JPG',
            'tzuyu': 'img/posters/Tzuyu.JPG'
        };

const stickersImagenes = {
            'nayeon': 'img/stickers/Nayeon stickers.jpg',
            'jeongyeon': 'img/stickers/Jeong stickers.jpg',
            'momo': 'img/stickers/Momo stickers.jpg',
            'sana': 'img/stickers/Sana stickers.jpg',
            'jihyo': 'img/stickers/jihyo.jpg',
            'mina': 'img/stickers/mina.jpg',
            'dahyun': 'img/stickers/Dubu stickers.jpg',
            'chaeyoung': 'img/stickers/CHAEYOUNG.jpg',
            'tzuyu': 'img/stickers/Tzuyu stickers.jpg'
        };

const bannerImagenes = {
            'nayeon': 'img/banner/Nayeon banner .jpg',
            'jeongyeon': 'img/banner/Copia de Jeong banner HD.jpg',
            'momo': 'img/banner/momo.jpg',
            'sana': 'img/banner/Copia de sana banner hd.jpg',
            'jihyo': 'img/banner/jihyo.jpg',
            'mina': 'img/banner/mina.jpg',
            'dahyun': 'img/banner/Dahyun banner.png',
            'chaeyoung': 'img/banner/CHAE BANNER.jpg',
            'tzuyu': 'img/banner/tzuyu.jpg'
        };

        function cambiarFotoPhotocard() {
            const miembro = document.getElementById('miembro-photocard').value;
            const img = document.getElementById('img-photocard');
            img.src = pcsImagenes[miembro.toLowerCase()];
            actualizarDisponibilidadCards();
        }

        function cambiarFotoProducto(selectId, imgId) {
            const select = document.getElementById(selectId);
            const img = document.getElementById(imgId);

            if (!select || !img) {
                return;
            }

            const miembro = String(select.value || '').toLowerCase();

            if (imgId === 'img-poster') {
                img.src = postersImagenes[miembro] || 'img/poster.png';
                actualizarDisponibilidadCards();
                return;
            }

            if (imgId === 'img-stickers') {
                img.src = stickersImagenes[miembro] || 'img/placeholder.png';
                actualizarDisponibilidadCards();
                return;
            }

            if (imgId === 'img-banner') {
                img.src = bannerImagenes[miembro] || 'img/banner/Nayeon banner .jpg';
                actualizarDisponibilidadCards();
                return;
            }
        }

        function abrirImagenGrande(src, alt) {
            const textoAlt = alt || 'Imagen del producto';
            Swal.fire({
                html: `<img src="${src}" alt="${textoAlt}" style="display:block;margin:0 auto;max-width:92vw;max-height:80vh;width:auto;height:auto;object-fit:contain;">`,
                showConfirmButton: false,
                showCloseButton: true,
                width: '92vw',
                padding: '0.75rem',
                backdrop: 'rgba(0, 0, 0, 0.8)'
            });
        }

        function habilitarZoomImagenes() {
            document.addEventListener('click', (event) => {
                const imagen = event.target.closest('.product-image');
                if (!imagen) {
                    return;
                }

                abrirImagenGrande(imagen.src, imagen.alt);
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'manual';
            }
            window.scrollTo(0, 0);

            cambiarFotoProducto('miembro-poster', 'img-poster');
            cambiarFotoProducto('miembro-stickers', 'img-stickers');
            cambiarFotoProducto('miembro-banner', 'img-banner');
            habilitarZoomImagenes();
        });

fetchData();
fetchInventario();
