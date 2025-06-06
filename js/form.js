'use strict'
const input_nombre = document.querySelector('#name')
const input_numero = document.querySelector('#phone')
const input_email = document.querySelector('#email')
const input_mensaje = document.querySelector('#message')

const validar = () => {
    let error = false
    if (input_nombre.value == '') {
        input_nombre.classList.add('error')
        error = true
    } else {
        input_nombre.classList.remove('error')
    }
    if (input_numero.value == '') {
        input_numero.classList.add('error')
        error = true
    } else {
        input_numero.classList.remove('error')
    }
    if (input_email.value == '') {
        input_email.classList.add('error')
        error = true
    } else {
        input_email.classList.remove('error')
    }
    if (input_mensaje.value == '') {
        input_mensaje.classList.add('error')
        error = true
    } else {
        input_mensaje.classList.remove('error')
    }
    return error
}

function submitform() {
    // let co = confirm('Deseea enviar estos datos?')

    if (validar() == false) {
        Swal.fire({
            title: 'La mismísima Jihyo va a revisar este correo. ¿Deseás enviarlo?',
            text: "Después de darle 'Sí, enviar', a continuación checkear la caja que dice 'No soy un robot'",
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, enviar',
            imageWidth: 200,
            imageHeight: 200,
            imageAlt: "Custom image"
        }).then((result) => {
            if (result.isConfirmed) {
                document.forms['myform'].submit()
                document.getElementById('myform').reset()
                Swal.fire({
                    icon: 'success',
                    title: 'Gracias!',
                    showConfirmButton: false,
                    timer: 1500,
                })
            }
        })
    } else {
        Swal.fire({
            icon: 'error',
            title: '¡Error!',
            text: 'Faltan datos. Por favor, rellenar todos los espacios.',
        })
    }
}