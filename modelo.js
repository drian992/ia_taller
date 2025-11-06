    async function enviar() {
      const input = document.getElementById("inputText");
      const output = document.getElementById("output");
      const mensaje = input.value.trim();
      if (!mensaje) return alert("Escribe algo antes de enviar.");

      output.innerHTML = "Minions trabajando espere...";
      input.value = "";

      try {
        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "meta-llama/Llama-3.1-8B-Instruct:novita",
            messages: [{ role: "user", content: mensaje }]
          })
        });

        const data = await response.json();
        let texto = data.choices?.[0]?.message?.content || data.generated_text || " Minion murio en el deber ,sin respuesta";
        output.innerHTML = texto;

      } catch (error) {
        output.innerHTML = "Error";
      }
    }

// Tema oscuro: alternar y persistir preferencia (fuera de enviar(), disponible globalmente)
function toggleTema(){
  const root = document.documentElement;
  const actual = root.getAttribute('data-tema');
  const nuevo = actual === 'oscuro' ? null : 'oscuro';
  if(nuevo) root.setAttribute('data-tema', 'oscuro'); else root.removeAttribute('data-tema');
  try{ localStorage.setItem('tema-preferencia', nuevo || 'claro'); }catch(e){ /* no crítico */ }
  // actualizar icono del botón si existe
  const btn = document.getElementById('temaToggle');
  if(btn){
    btn.textContent = nuevo ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', nuevo ? 'true' : 'false');
  }
}

// Inicializar tema según preferencia guardada o sistema
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    const pref = localStorage.getItem('tema-preferencia');
    if(pref === 'oscuro'){
      document.documentElement.setAttribute('data-tema','oscuro');
      const btn = document.getElementById('temaToggle'); if(btn){ btn.textContent = '☀️'; btn.setAttribute('aria-pressed','true'); }
      return;
    }
  }catch(e){ /* ignore */ }
  // si no hay preferencia, opcionalmente respetar prefers-color-scheme
  if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
    document.documentElement.setAttribute('data-tema','oscuro');
    const btn = document.getElementById('temaToggle'); if(btn){ btn.textContent = '☀️'; btn.setAttribute('aria-pressed','true'); }
  }
});
  