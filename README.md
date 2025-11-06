# Chat IA con Hugging Face GPT-2

Esta aplicación web mínima permite conversar con un asistente basado en el modelo público **GPT-2** alojado en la Hugging Face Inference API. La interfaz se ha simplificado para centrarse exclusivamente en escribir mensajes, enviarlos y visualizar la respuesta generada.

## Características

- Interfaz limpia con historial de mensajes en forma de burbujas.
- Solicitudes directas al endpoint `https://api-inference.huggingface.co/models/gpt2`.
- Posibilidad de añadir tu token personal de Hugging Face editando una constante en `modelo.js`.

## Uso

1. Abre `index.html` en tu navegador.
2. Escribe un mensaje en el campo de texto.
3. Pulsa **Enviar** o presiona `Ctrl+Enter` (`Cmd+Enter` en macOS) para enviar.
4. El asistente responderá utilizando el modelo GPT-2.

> **Nota:** El endpoint público de Hugging Face puede tardar en generar la primera respuesta si el modelo está en reposo. Si dispones de un token con permisos de inferencia, añádelo en `modelo.js` para mejorar la fiabilidad:
>
> ```js
> const HUGGINGFACE_API_TOKEN = 'hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXX';
> ```

## Desarrollo

El proyecto está compuesto únicamente por archivos estáticos:

- `index.html`: Estructura de la interfaz.
- `index.css`: Estilos del chat.
- `modelo.js`: Lógica para renderizar mensajes y llamar a la API de Hugging Face.

No se requieren dependencias adicionales ni un servidor específico; cualquier servidor estático funcionará.
