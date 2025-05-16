const input_numero = document.querySelector('#phone')


const validar = () => {
    let error = false
    if (input_numero.value == '') {
        input_numero.classList.add('error')
        error = true
    } else {
        input_numero.classList.remove('error')
    }
    return error
}

function submitform() {
    // let co = confirm('Deseea enviar estos datos?')

    if (validar() == false) {
        Swal.fire({
            title: "Tienes 80 CandyPoints.",
            width: 600,
            padding: "3em",
            color: "#49f7d9",
            background: "#fff url(img/candypop.jpg)",
            backdrop: `
              rgba(0,0,123,0.4)
              url("img/sana.gif")
              bottom center
              no-repeat
            `
          });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Faltan datos por favor rellenar todos los espacios.',
        })
    }
}

