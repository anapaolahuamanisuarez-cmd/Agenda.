
"use strict";

/* ======================================
   ATEMPORAL 2.0
   NAVEGACIÓN INTERACTIVA
====================================== */

document.addEventListener("DOMContentLoaded", () => {

  const navButtons = document.querySelectorAll("[data-section]");
  const panels = document.querySelectorAll("[data-panel]");

  function showSection(sectionName) {

    // Ocultar todos los paneles
    panels.forEach(panel => {
      panel.hidden = panel.dataset.panel !== sectionName;
    });

    // Actualizar botones activos
    navButtons.forEach(button => {
      const active = button.dataset.section === sectionName;

      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    // Guardar última sección visitada
    localStorage.setItem("at_last_section", sectionName);
  }

  // Escuchar todos los botones del menú
  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  });

  // Recuperar última sección o abrir Inicio
  const savedSection = localStorage.getItem("at_last_section");

  const sectionExists = [...panels].some(
    panel => panel.dataset.panel === savedSection
  );

  showSection(sectionExists ? savedSection : "home");

});
