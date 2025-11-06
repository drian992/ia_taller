# Chat IA configurable

Aplicación web sencilla para conversar con modelos de lenguaje a través de APIs públicas compatibles con el formato **OpenAI / Chat Completions**. Incluye selector de proveedor, persistencia de configuración y modo oscuro.

## Características

- Historial de conversación con diseño tipo burbujas.
- Configuración persistente (URL, modelo, token) almacenada en `localStorage`.
- Soporte para distintos proveedores públicos:
  - `FreeGPT`: proxy público sin autenticación (`https://free.churchless.tech/v1/chat/completions`).
  - `OpenRouter`: requiere API Key personal desde [https://openrouter.ai](https://openrouter.ai).
  - `Hugging Face Inference`: requiere token con permisos de inferencia.
  - Opción personalizada para cualquier endpoint compatible.
- Guardado automático del historial (se puede limpiar desde la interfaz).
- Atajo **Ctrl+Enter** (o Cmd+Enter) para enviar el mensaje actual.

## Uso

1. Abre `index.html` en un navegador moderno.
2. Pulsa el botón **⚙️ Configuración** y selecciona un proveedor.
3. Ajusta la URL, el modelo y, si aplica, introduce tu token.
4. Escribe tu mensaje en el cuadro de texto y presiona **Enviar**.

> **Nota:** Los proxys públicos sin autenticación pueden presentar tiempos de respuesta inestables. Si cuentas con una API Key propia se recomienda utilizarla.

## Desarrollo

Los archivos principales son:

- `index.html`: estructura de la interfaz.
- `index.css`: estilos y tema oscuro.
- `modelo.js`: lógica del chat, manejo de configuración y consumo de APIs.

No se necesita tooling adicional; basta con abrir el archivo HTML en el navegador.
