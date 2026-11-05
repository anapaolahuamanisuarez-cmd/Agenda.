import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);
const message = (text, error = false) => {
  $("auth-message").textContent = text;
  $("auth-message").className = error ? "message error" : "message success";
};

const goToApp = () => { window.location.href = "index.html"; };

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) goToApp();
})();

$("email-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  $("login-btn").disabled = true;
  message("Ingresando…");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  $("login-btn").disabled = false;
  if (error) return message(error.message, true);
  goToApp();
});

$("signup-btn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 6) {
    return message("Escribe un correo válido y una contraseña de al menos 6 caracteres.", true);
  }
  $("signup-btn").disabled = true;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname.replace(/login\.html$/, "index.html") }
  });
  $("signup-btn").disabled = false;
  if (error) return message(error.message, true);
  if (data.session) goToApp();
  else message("Cuenta creada. Revisa tu correo para confirmar el registro y luego inicia sesión.");
});

$("google-btn").addEventListener("click", async () => {
  const redirectTo = window.location.origin + window.location.pathname.replace(/login\.html$/, "index.html");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });
  if (error) message(error.message, true);
});

$("send-otp-btn").addEventListener("click", async () => {
  const phone = $("phone").value.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return message("Usa el formato internacional, por ejemplo: +51987654321.", true);
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return message(error.message, true);
  message("Código enviado. Revisa tus SMS.");
});

$("verify-otp-btn").addEventListener("click", async () => {
  const phone = $("phone").value.trim();
  const token = $("otp").value.trim();
  if (!phone || !token) return message("Escribe tu teléfono y el código recibido.", true);
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return message(error.message, true);
  goToApp();
});
