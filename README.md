# Phantom AI — Ghost in the Machine

A spooky AI chat experience built with HTML, CSS, and JavaScript. It connects directly to a local [Ollama](https://ollama.com/) server, so prompts are processed by the model running on your computer rather than a remote AI API.

## Features

- Responsive haunted-terminal interface
- Three AI personas: The Whisperer, The Archivist, and The Glitch
- AI-generated horror story mode
- Conversation context for the current browser session
- Local Ollama API integration
- No API key required for local inference

## Requirements

- Windows, macOS, or Linux
- [Ollama](https://ollama.com/download) installed and running
- A model downloaded in Ollama
- Visual Studio Code with the Live Server extension, or another local web server

## 1. Install a model

Open a terminal and run:

```bash
ollama pull qwen3:1.7b
```

Then check the model is available:

```bash
ollama list
```

If your computer has limited memory, try `qwen3:0.6b` instead. If you choose a different model, update `MODEL_NAME` at the top of `script.js` to match the model name shown by `ollama list`.

Model library: https://ollama.com/library/qwen3

## 2. Start Ollama

Open the Ollama desktop application. On systems where the service is not already running, you can start it in a terminal with:

```bash
ollama serve
```

Leave the service running while you use Phantom AI.

## 3. Open the website

1. Open the `phantom-ai` folder in Visual Studio Code.
2. Install the **Live Server** extension if you do not already have it.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Prefer the local address `http://127.0.0.1:5500` if Live Server offers it.
5. Click **Check connection** in the sidebar, then send a message.

Do not open the HTML file by double-clicking it (`file://`); use a local web server.

## 4. If the browser cannot connect

- Confirm Ollama is running.
- Run `ollama list` and check that the model name matches `MODEL_NAME` in `script.js`.
- Open `http://127.0.0.1:11434/api/tags` in your browser. You should see JSON listing installed models.
- Use a local website address such as `http://127.0.0.1:5500`.
- Ollama's local service normally allows requests from `127.0.0.1`. If you changed Ollama's origin settings, check its official FAQ before changing them.

Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api/introduction.mdx  
Ollama CORS FAQ: https://github.com/ollama/ollama/blob/main/docs/faq.mdx

## How it works

```text
index.html + style.css
          |
       script.js
          |
http://127.0.0.1:11434/api/chat
          |
    Ollama local runtime
          |
  Installed open-weight model
```

## Privacy notes

This starter app sends chat prompts to the local Ollama API at `127.0.0.1`. It does not intentionally send prompts to a remote AI API. The page loads Google Fonts from the internet; remove the font links in `index.html` and use system fonts if you want to avoid that external font request. Browser extensions, network configuration, and the host operating system are outside this app's control.

## Troubleshooting

**"Failed to fetch"**  
Ollama may be stopped, the model may not be installed, or the page may not be served from a permitted local origin.

**Model not found**  
Run `ollama pull qwen3:1.7b`, or change `MODEL_NAME` in `script.js` to a model that `ollama list` shows.

**Responses are slow**  
Small models can respond faster but may be less capable. Close memory-heavy applications or try a smaller model such as `qwen3:0.6b`.

## Open-source challenge post idea

Phantom AI explores open innovation by running an open-weight model locally. A local-first setup gives users more control over where their prompts go, lets developers experiment with different models and character prompts, and can continue to work without an internet connection after the runtime and model are installed. Its trade-off is that the user must download the model and have hardware capable of running it.

Before publishing, verify the model's current license and include the model name, runtime, and project limitations in your post.
