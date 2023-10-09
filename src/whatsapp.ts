import {Client, ClientOptions, LocalAuth, Message} from 'whatsapp-web.js';
import {config, WhatsappConfig} from './config';
import {AudioTranscriber} from './audio';

export class WhatsappClient {
  private client: Client;
  private config: WhatsappConfig;
  constructor(private transcriber: AudioTranscriber) {
    this.config = config.whatsapp;
    const auth = new LocalAuth();

    const clientOptions: ClientOptions = {
      authStrategy: auth,
      puppeteer: {
        headless: false,
        args: ['--no-sandbox'],
      },
    };

    this.client = new Client(clientOptions);
  }

  initialize() {
    this.client.on('qr', qr => {
      console.log('QR ready', qr);
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`Loading: ${percent}% ${message}`);
    });

    this.client.on('auth_failure', msg => {
      console.error('Auth failure', msg);
    });

    this.client.on('authenticated', session => {
      console.log('Authenticated', session);
    });

    this.client.on('ready', () => {
      console.log('this.client is ready!');
    });

    this.client.on('message', message => this.onMessage(message));

    this.client.on('change_state', state => {
      console.log('this.client state changed', state);
    });

    this.client.initialize();
  }

  private async shouldTranscribe(message: Message): Promise<boolean> {
    if (message.type !== 'ptt') return false;
    const contact = await message.getContact();
    const number = contact.number;
    if (this.config.transcription.blacklist.includes(number)) {
      return false;
    }
    if (this.config.transcription.allowAll) {
      return true;
    }
    return this.config.transcription.whitelist.includes(number);
  }

  async renderTranscriptionInTemplate(
    message: Message,
    text: string
  ): Promise<string> {
    const chat = await message.getChat();
    const chatName: string = chat.name;
    const fromContact = await message.getContact();
    const contactDisplayName =
      fromContact.name ??
      fromContact.pushname ??
      fromContact.number ??
      chatName;
    let renderedText = this.config.transcription.message.template;
    renderedText = renderedText.replace('{chat}', chatName);
    renderedText = renderedText.replace('{author}', contactDisplayName);
    renderedText = renderedText.replace('{text}', text);
    return renderedText;
  }

  async sendMessageToSelf(text: string, quotedMessageId?: string) {
    await this.client.sendMessage(this.client.info.wid._serialized, text, {
      quotedMessageId,
    });
  }

  async transcribeAndSendMessage(message: Message): Promise<void> {
    if (!message.hasMedia) return;
    const media = await message.downloadMedia();
    const contents = Buffer.from(media.data, 'base64');
    console.debug(
      `Will try to transcribe media type ${media.mimetype} (${media.filename})` +
        ` ${media.filesize} bytes, duration ${message.duration}s`
    );
    try {
      const transcribedText = await this.transcriber.transcribeAudio(contents);

      const renderedText = await this.renderTranscriptionInTemplate(
        message,
        transcribedText
      );

      switch (this.config.transcription.message.mode) {
        case 'self':
          await this.sendMessageToSelf(renderedText, message.id._serialized);
          break;
        case 'reply':
          await message.reply(renderedText);
          break;
      }
    } catch (e) {
      console.error(e);
      console.error(
        `Message media type: ${media.mimetype} size ${media.filesize} filename ${media.filename}`
      );
    }
  }

  async onMessage(message: Message): Promise<void> {
    console.debug(await this.debugMessageString(message));
    if (this.shouldTranscribe(message)) {
      await this.transcribeAndSendMessage(message);
    }
  }

  async debugMessageString(message: Message): Promise<string> {
    const chat = await message.getChat();
    const chatName: string = chat.name;
    let author: string = message.from;
    if (chat.isGroup) {
      author = message.author!;
    }
    const fromContact = await message.getContact();
    const contactDisplayName = fromContact.name ?? fromContact.pushname;
    return `[${message.type}] on "${chatName}" (${chat.id._serialized}) from "${contactDisplayName}" (${author})`;
  }
}
