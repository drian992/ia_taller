const STORAGE_KEY = 'ia-chat-config';
const HISTORY_KEY = 'ia-chat-historial';
const DEFAULT_SYSTEM_PROMPT = 'Eres un asistente conversacional útil. Responde en español cuando el usuario escriba en español.';

const PROVIDERS = {
  freegpt: {
    label: 'FreeGPT (proxy público)',
    endpoint: 'https://free.churchless.tech/v1/chat/completions',
    model: 'gpt-4o-mini',
    descripcion: 'Proxy comunitario compatible con el formato OpenAI. No requiere autenticación, pero puede estar saturado.',
    prepararSolicitud(config, historial, mensaje) {
      return construirOpenAIRequest({
        endpoint: config.endpoint || this.endpoint,
        apiKey: config.token,
        model: config.model || this.model,
        historial,
        mensaje
      });
    },
    parsearRespuesta(json) {
      return json?.choices?.[0]?.message?.content?.trim() ?? json?.choices?.[0]?.text?.trim();
    }
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'mistralai/mixtral-8x7b-instruct',
    descripcion: 'Requiere una API key gratuita desde openrouter.ai. Compatible con formato OpenAI.',
    prepararSolicitud(config, historial, mensaje) {
      return construirOpenAIRequest({
        endpoint: config.endpoint || this.endpoint,
        apiKey: config.token,
        model: config.model || this.model,
        historial,
        mensaje,
        extra: {
          provider: {
            order: ['openrouter']
          }
        }
      });
    },
    parsearRespuesta(json) {
      return json?.choices?.[0]?.message?.content?.trim();
    }
  },
  huggingface: {
    label: 'Hugging Face Inference',
    endpoint: 'https://router.huggingface.co/v1/chat/completions',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    descripcion: 'Necesita un token de Hugging Face con permiso de inferencia (https://huggingface.co/settings/tokens).',
    prepararSolicitud(config, historial, mensaje) {
      return construirOpenAIRequest({
        endpoint: config.endpoint || this.endpoint,
        apiKey: config.token,
        model: config.model || this.model,
        historial,
        mensaje
      });
    },
    parsearRespuesta(json) {
      return json?.choices?.[0]?.message?.content?.trim() ?? json?.generated_text?.trim();
    }
  }
};

const estadoApp = {
  historial: [],
  controladorAbort: null
};

function construirOpenAIRequest({ endpoint, apiKey, model, historial, mensaje, extra = {} }) {
  const mensajes = [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    ...historial,
    { role: 'user', content: mensaje }
  ];

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

  const body = JSON.stringify({
    model,
    messages: mensajes,
    temperature: 0.7,
    max_tokens: 640,
    ...extra
  });

  return { url: endpoint, options: { method: 'POST', headers, body } };
}

function obtenerConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defecto = {
        provider: 'freegpt',
        endpoint: PROVIDERS.freegpt.endpoint,
        model: PROVIDERS.freegpt.model,
        token: ''
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defecto));
      return defecto;
    }
    const parsed = JSON.parse(raw);
    return {
      provider: 'freegpt',
      endpoint: PROVIDERS.freegpt.endpoint,
      model: PROVIDERS.freegpt.model,
      token: '',
      ...parsed
    };
  } catch (error) {
    console.warn('No se pudo leer la configuración almacenada', error);
    return {
      provider: 'freegpt',
      endpoint: PROVIDERS.freegpt.endpoint,
      model: PROVIDERS.freegpt.model,
      token: ''
    };
  }
}

function guardarConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function cargarHistorial() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(m => m && typeof m.role === 'string' && typeof m.content === 'string');
  } catch (error) {
    console.warn('No se pudo leer el historial almacenado', error);
    return [];
  }
}

function guardarHistorial(historial) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historial));
  } catch (error) {
    console.warn('No se pudo guardar el historial', error);
  }
}

function prepararUI() {
  const config = obtenerConfig();
  estadoApp.historial = cargarHistorial();
  renderizarHistorial();
  actualizarEstado('Listo');

  const input = document.getElementById('inputText');
  const btnEnviar = document.getElementById('enviar');
  const btnLimpiar = document.getElementById('limpiarChat');
  const btnConfig = document.getElementById('abrirConfig');
  const dialogo = document.getElementById('configDialog');
  const form = document.getElementById('configForm');
  const selectProveedor = document.getElementById('providerSelect');
  const inputEndpoint = document.getElementById('endpointInput');
  const inputModelo = document.getElementById('modelInput');
  const inputToken = document.getElementById('tokenInput');
  const textoAyuda = document.getElementById('providerHelp');

  aplicarConfigAFormulario(config, { selectProveedor, inputEndpoint, inputModelo, inputToken, textoAyuda });

  btnEnviar.addEventListener('click', () => manejarEnvio());
  input.addEventListener('keydown', (evento) => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter') {
      evento.preventDefault();
      manejarEnvio();
    }
  });

  btnLimpiar.addEventListener('click', () => {
    estadoApp.historial = [];
    guardarHistorial(estadoApp.historial);
    renderizarHistorial();
    actualizarEstado('Historial limpiado');
  });

  btnConfig.addEventListener('click', () => {
    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    } else {
      alert('Tu navegador no soporta el componente dialog. Configura la API manualmente en modelo.js.');
    }
  });

  selectProveedor.addEventListener('change', () => {
    const proveedor = selectProveedor.value;
    aplicarProveedorPorDefecto(proveedor, { inputEndpoint, inputModelo });
    actualizarAyudaProveedor(proveedor, textoAyuda);
  });

  form.addEventListener('reset', () => {
    dialogo.close('cancel');
    aplicarConfigAFormulario(obtenerConfig(), { selectProveedor, inputEndpoint, inputModelo, inputToken, textoAyuda });
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const nuevaConfig = {
      provider: selectProveedor.value,
      endpoint: inputEndpoint.value.trim(),
      model: inputModelo.value.trim(),
      token: inputToken.value.trim()
    };
    guardarConfig(nuevaConfig);
    dialogo.close('confirm');
    actualizarEstado('Configuración guardada');
  });
}

function aplicarConfigAFormulario(config, elementos) {
  const { selectProveedor, inputEndpoint, inputModelo, inputToken, textoAyuda } = elementos;
  const opciones = Array.from(selectProveedor.options).map(opt => opt.value);
  const proveedorValido = opciones.includes(config.provider) ? config.provider : 'freegpt';
  selectProveedor.value = proveedorValido;
  const proveedor = PROVIDERS[proveedorValido];
  inputEndpoint.value = config.endpoint || proveedor?.endpoint || '';
  inputModelo.value = config.model || proveedor?.model || '';
  inputToken.value = config.token || '';
  actualizarAyudaProveedor(proveedorValido, textoAyuda);
}

function aplicarProveedorPorDefecto(proveedorSeleccionado, { inputEndpoint, inputModelo }) {
  const proveedor = PROVIDERS[proveedorSeleccionado];
  if (proveedor) {
    inputEndpoint.value = proveedor.endpoint;
    inputModelo.value = proveedor.model;
  } else if (proveedorSeleccionado === 'personalizado') {
    inputEndpoint.value = '';
    inputModelo.value = '';
  }
}

function actualizarAyudaProveedor(proveedorSeleccionado, textoAyuda) {
  const proveedor = PROVIDERS[proveedorSeleccionado];
  if (proveedor) {
    textoAyuda.textContent = proveedor.descripcion;
  } else if (proveedorSeleccionado === 'personalizado') {
    textoAyuda.textContent = 'Indica un endpoint compatible con el formato OpenAI y, si aplica, introduce el token de acceso.';
  } else {
    textoAyuda.textContent = '';
  }
}

function manejarEnvio() {
  const input = document.getElementById('inputText');
  const mensaje = input.value.trim();
  if (!mensaje) {
    alert('Escribe algo antes de enviar.');
    return;
  }
  input.value = '';
  agregarMensaje({ role: 'user', content: mensaje });
  consultarModelo(mensaje).catch((error) => {
    if (error?.name === 'AbortError') {
      actualizarEstado('Consulta anterior cancelada');
      return;
    }
    console.error(error);
    actualizarEstado(error.message || 'Error al consultar la API');
    retirarMensajeTemporal();
    agregarMensaje({ role: 'assistant', content: 'Hubo un problema al obtener la respuesta. Inténtalo de nuevo.' });
  });
}

function agregarMensaje(mensaje) {
  estadoApp.historial.push({ ...mensaje, timestamp: new Date().toISOString() });
  guardarHistorial(estadoApp.historial);
  renderizarHistorial();
}

function renderizarHistorial() {
  const contenedor = document.getElementById('output');
  const plantilla = document.getElementById('mensajeTemplate');
  contenedor.innerHTML = '';

  estadoApp.historial
    .filter(msg => msg.role !== 'system')
    .forEach(msg => {
      const nodo = plantilla.content.cloneNode(true);
      nodo.querySelector('.mensaje-autor').textContent = msg.role === 'assistant' ? 'Asistente' : 'Tú';
      nodo.querySelector('.mensaje-contenido').textContent = msg.content;
      const time = nodo.querySelector('.mensaje-hora');
      if (time && msg.timestamp) {
        const fecha = new Date(msg.timestamp);
        time.textContent = fecha.toLocaleTimeString();
        time.hidden = false;
      }
      contenedor.appendChild(nodo);
    });

  contenedor.scrollTop = contenedor.scrollHeight;
}

function actualizarEstado(texto) {
  const estado = document.getElementById('estado');
  estado.textContent = texto;
}

async function consultarModelo(mensaje) {
  if (estadoApp.controladorAbort) {
    estadoApp.controladorAbort.abort();
  }
  const config = obtenerConfig();
  const proveedor = obtenerProveedorActivo(config);
  if (!proveedor) {
    throw new Error('Proveedor no soportado. Revisa la configuración.');
  }

  const historialParaSolicitud = estadoApp.historial
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(({ role, content }) => ({ role, content }));

  const { url, options } = proveedor.prepararSolicitud(config, historialParaSolicitud, mensaje);
  if (!url) throw new Error('El endpoint no es válido.');

  actualizarEstado('Consultando el modelo...');
  retirarMensajeTemporal();
  agregarMensajeTemporal();

  const controlador = new AbortController();
  estadoApp.controladorAbort = controlador;
  const opciones = { ...options, signal: controlador.signal };

  try {
    const respuesta = await fetch(url, opciones);
    if (!respuesta.ok) {
      const textoError = await respuesta.text();
      throw new Error(`Error ${respuesta.status}: ${textoError}`);
    }
    const datos = await respuesta.json();
    const contenido = proveedor.parsearRespuesta(datos);
    if (!contenido) {
      throw new Error('La API no devolvió contenido.');
    }
    reemplazarMensajeTemporal(contenido);
    actualizarEstado('Respuesta recibida');
  } finally {
    estadoApp.controladorAbort = null;
  }
}

function obtenerProveedorActivo(config) {
  if (config.provider === 'personalizado') {
    return {
      prepararSolicitud: (cfg, historial, mensaje) => construirOpenAIRequest({
        endpoint: cfg.endpoint,
        apiKey: cfg.token,
        model: cfg.model,
        historial,
        mensaje
      }),
      parsearRespuesta: (json) => json?.choices?.[0]?.message?.content?.trim() || json?.choices?.[0]?.text?.trim()
    };
  }
  return PROVIDERS[config.provider];
}

function agregarMensajeTemporal() {
  agregarMensaje({ role: 'assistant', content: '⏳ La IA está pensando...' });
}

function retirarMensajeTemporal() {
  for (let i = estadoApp.historial.length - 1; i >= 0; i -= 1) {
    const mensaje = estadoApp.historial[i];
    if (mensaje.role === 'assistant' && mensaje.content.startsWith('⏳')) {
      estadoApp.historial.splice(i, 1);
      guardarHistorial(estadoApp.historial);
      renderizarHistorial();
      break;
    }
  }
}

function reemplazarMensajeTemporal(respuesta) {
  for (let i = estadoApp.historial.length - 1; i >= 0; i -= 1) {
    const mensaje = estadoApp.historial[i];
    if (mensaje.role === 'assistant' && mensaje.content.startsWith('⏳')) {
      estadoApp.historial[i] = {
        role: 'assistant',
        content: respuesta,
        timestamp: new Date().toISOString()
      };
      guardarHistorial(estadoApp.historial);
      renderizarHistorial();
      return;
    }
  }
  agregarMensaje({ role: 'assistant', content: respuesta });
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
    } else if(pref === 'claro'){
      document.documentElement.removeAttribute('data-tema');
    } else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
      document.documentElement.setAttribute('data-tema','oscuro');
      const btn = document.getElementById('temaToggle'); if(btn){ btn.textContent = '☀️'; btn.setAttribute('aria-pressed','true'); }
    }
  }catch(e){ /* ignore */ }

  prepararUI();
});

