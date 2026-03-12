<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: contactanos.html');
    exit;
}

$name = trim($_POST['Name'] ?? $_POST['name'] ?? '');
$email = trim($_POST['Email'] ?? $_POST['email'] ?? '');
$phone = trim($_POST['Phone'] ?? $_POST['phone'] ?? '');
$message = trim($_POST['Mensaje'] ?? $_POST['message'] ?? '');

if ($name === '' || $email === '' || $message === '') {
    header('Location: contactanos.html?status=error');
    exit;
}

$safeEmail = filter_var($email, FILTER_SANITIZE_EMAIL);
$formcontent = "From: $name\nCelular: $phone\nMensaje: $message\nCorreo: $safeEmail";
$recipient = 'twicecr.once@gmail.com';
$subject = 'Caja de sugerencias o quejas';
$mailheader = "From: $safeEmail\r\nReply-To: $safeEmail\r\n";

$sent = mail($recipient, $subject, $formcontent, $mailheader);

if ($sent) {
    header('Location: contactanos.html?status=ok');
    exit;
}

header('Location: contactanos.html?status=error');
exit;
?>
