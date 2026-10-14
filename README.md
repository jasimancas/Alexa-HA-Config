# 🌟 Alexa HA Config — Home Assistant Add-on

### Select exactly which entities you want to share with Amazon Alexa

**Alexa HA Config** is a Home Assistant add-on designed to give you fine‑grained control over what your Amazon Alexa integration can see. Instead of exposing your entire smart home to Alexa, this add-on lets you choose _exactly_ which entities should be shared — nothing more, nothing less.

This means better privacy, cleaner Alexa device lists, and a smarter, more intentional voice assistant experience.

---

## ✨ Why Alexa HA Config?

Home Assistant’s built‑in [Amazon Alexa integration](https://www.home-assistant.io/integrations/alexa/) is powerful, but it can sometimes expose more entities than you’d like. If you’ve ever opened the Alexa app and found dozens of devices you never intended to share, you know the feeling.

**Alexa HA Config solves that.**

With this add-on, you can:

- 🟦 **Select specific entities** to expose to Alexa
- 🔒 **Keep sensitive or internal entities private**
- 🧹 **Avoid clutter in the Alexa app**
- 🎛️ **Fine‑tune your smart home voice experience**
- ⚡ **Make Alexa faster and more reliable** by reducing unnecessary devices

---

## 🧠 How It Works

Alexa HA Config provides a simple web interface (powered by a Next.js app) where you can:

1. Browse all your Home Assistant entities
2. Choose which ones should be shared with Alexa
3. Save your selection
4. Let the add-on automatically generate the correct configuration for the Alexa integration

No YAML editing. No digging through configuration files. No accidental oversharing.

Just a clean, intuitive UI that puts you in control.

---

## 🚀 Key Features

- **Entity picker UI** — Select entities with a click, or share/unshare everything matching a filter
- **Safe YAML editing** — only the Alexa entity list changes; your comments, `!include` and `!secret` stay intact
- **Automatic backups** of every file it modifies
- **Validate & restart** Home Assistant from the add-on after publishing
- **Supports Intel 64, Raspberry Pi, and Apple Silicon**
- **Runs as a lightweight Next.js app inside Home Assistant**
- **Optional sidebar entry for quick access**

---

## 🛠️ Installation

### Quick Install

[![Add Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fjasimancas%2FAlexa-HA-Config)

### Manual Installation

1. Go to **Settings** > **Add-ons** > **Add-on Store**
2. Click the menu (⋮) > **Repositories**
3. Add: `https://github.com/jasimancas/Alexa-HA-Config`
4. Find and install **Alexa HA Config**
5. Start the add-on and open the web UI
6. Choose which entities you want Alexa to see
7. Click **Publish Changes**, then **Check & restart** so Home Assistant picks up the new list
8. Ask Alexa to *"discover devices"*

That's it — Alexa now only knows what _you_ want it to know.

---

## ❤️ Why You’ll Love It

Smart homes are personal. Not every sensor, switch, or automation needs to be visible to your voice assistant. Alexa HA Config gives you the power to curate your Alexa experience so it feels intentional, tidy, and private.

If you've ever wished for a simple way to manage Alexa's visibility into your Home Assistant setup, this add-on is exactly what you've been waiting for.

---

## 📖 Documentation

For detailed usage instructions, configuration options, and troubleshooting, see the [Documentation](DOCS.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
