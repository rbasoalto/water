# WhatsApp TranscribER

Connects to your whatsapp account (using [whatsapp-web.js](https://wwebjs.dev)),
and automatically transcribes "PTT" audio messages with OpenAI.

## Requirements

* Node.js >= 18
* Yarn v1

## Running

Set the `OPENAI_API_KEY` environment variable, and run with `yarn && yarn
start`. The first time it'll show a message in the console saying `QR ready`
followed by a long string. Make a QR code with that string using your favorite
QR code generator, and scan it with your phone's WhatsApp app, in the "linked
devices" section. Then wait a bit and it'll be ready.

## Configuring

Look at `src/config.ts`, it's pretty self-explanatory, and put your config in
`config/default.json`.

# TODOs / Wishlist

* Dockerized deployment
* Some tests and CI would be nice...
* Pluggable remote session storage, so you don't depend on persisent FS and
  mounted docker volumes (supported in principle by wwebjs, just need to choose
  a suitable storage backend)
* Web-based remote-control, QR display, config editing, etc.
* Log messages somewhere, maybe keep a log of edited/deleted messages, whatever... SQLite probably works well for that
