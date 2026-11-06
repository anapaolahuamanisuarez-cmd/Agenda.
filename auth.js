
import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);

const message = (text, error = false) => {
  const element = $("auth-message");
  if (!element) return;

  element.textContent = text;
  element.className = error
    ? "message error"
    : "message success";
};

const setBusy = (id, busy, originalText) => {
  const button = $(id);
  if (!button) return;

  button.disabled = busy;
  button.textContent = busy ? "Procesando..." : originalText;
};

const goToApp = () => {
  window.location.assign(
    new URL("index.html", window.location.href).href
  );
};

const getRedirectUrl = () => {
  return new URL("index.html", window.location.href).href;
};

// Comprobar si ya existe una sesión
async function checkSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session) {
      goToApp();
    }
  } catch (error) {
    console.error("Error al comprobar sesión:", error);
    message("No se pudo comprobar tu sesión. Inténtalo nuevamente.", true);
  }
}

// Iniciar sesión con correo
$("email-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    return message("Completa tu correo y contraseña.", true);
  }

  setBusy("login-btn", true, "Iniciar sesión");
  message("Verificando tus datos...");

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    message("Inicio de sesión correcto.");
    goToApp();

  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    message(error.message || "No se pudo iniciar sesión.", true);

  } finally {
    setBusy("login-btn", false, "Iniciar sesión");
  }
});

// Crear cuenta con correo
$("signup-btn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !$("email").checkValidity()) {
    return message("Escribe un correo electrónico válido.", true);
  }

  if (password.length < 6) {
    return message("La contraseña debe tener al menos 6 caracteres.", true);
  }

  setBusy("signup-btn", true, "Crear cuenta");
  message("Creando tu cuenta...");

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    });

    if (error) throw error;

    if (data.session) {
      message("¡Tu cuenta se creó correctamente!");
      goToApp();
    } else {
      message(
        "Registro realizado. Revisa tu correo y confirma tu cuenta antes de iniciar sesión."
      );
    }

  } catch (error) {
    console.error("Error al registrar:", error);
    message(error.message || "No se pudo crear la cuenta.", true);

  } finally {
    setBusy("signup-btn", false, "Crear cuenta");
  }
});

// Acceso con Google
$("google-btn").addEventListener("click", async () => {
  setBusy("google-btn", true, "Continuar con Google");

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl()
      }
    });

    if (error) throw error;

  } catch (error) {
    console.error("Error con Google:", error);
    message(error.message || "No se pudo iniciar con Google.", true);
    setBusy("google-btn", false, "Continuar con Google");
  }
});

// Enviar código SMS
$("send-otp-btn").addEventListener("click", async () => {
  const phone = $("phone").value.trim();

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return message(
      "Usa el formato internacional. Ejemplo: +51987654321.",
      true
    );
  }

  setBusy("send-otp-btn", true, "Enviar código SMS");

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone
    });

    if (error) throw error;

    message("Código enviado. Revisa tus SMS.");

  } catch (error) {
    console.error("Error al enviar SMS:", error);
    message(error.message || "No se pudo enviar el código.", true);

  } finally {
    setBusy("send-otp-btn", false, "Enviar código SMS");
  }
});

// Verificar código SMS
$("verify-otp-btn").addEventListener("click", async () => {
  const phone = $("phone").value.trim();
  const token = $("otp").value.trim();

  if (!phone || !token) {
    return message("Escribe tu teléfono y el código recibido.", true);
  }

  setBusy("verify-otp-btn", true, "Verificar e ingresar");

  try {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms"
    });

    if (error) throw error;

    message("Verificación correcta.");
    goToApp();

  } catch (error) {
    console.error("Error al verificar SMS:", error);
    message(error.message || "No se pudo verificar el código.", true);

  } finally {
    setBusy("verify-otp-btn", false, "Verificar e ingresar");
  }
});

// Ejecutar comprobación inicial
checkSession();
