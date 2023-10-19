import {
  Client,
  ClientOptions,
  Events,
  LocalAuth,
  Message,
  MessageMedia,
  MessageTypes,
} from 'whatsapp-web.js';
import {config, WhatsappConfig} from './config';
import {AudioTranscriber} from './audio';
import {logger} from './logger';
import {Stash} from './types';

export class WhatsappClient {
  private client: Client;
  private config: WhatsappConfig;
  constructor(private transcriber: AudioTranscriber) {
    this.config = config.whatsapp;
    const auth = new LocalAuth();

    const clientOptions: ClientOptions = {
      authStrategy: auth,
      puppeteer: {
        headless: 'new',
        debuggingPort: 12345,
        args: ['--disable-gpu'],
      },
    };

    this.client = new Client(clientOptions);
  }

  async initialize() {
    this.client.on('qr', qr => {
      logger.info('QR ready', {qr});
    });

    this.client.on(Events.LOADING_SCREEN, (percent, message) => {
      logger.debug(`Loading: ${percent}% ${message}`);
    });

    this.client.on(Events.AUTHENTICATION_FAILURE, msg => {
      logger.error('Auth failure', msg);
    });

    this.client.on(Events.AUTHENTICATED, session => {
      logger.info('Authenticated', session);
    });

    this.client.on(Events.READY, () => {
      logger.info('Client is ready!');
    });

    this.client.on(Events.MESSAGE_CREATE, message => {
      this.onMessage(message).catch(e => {
        logger.error('Error handling message', e);
      });
    });

    this.client.on(Events.STATE_CHANGED, state => {
      logger.info('Client state changed', state);
    });

    await this.client.initialize();
  }

  private isAudioMessage(message: Message): boolean {
    return [MessageTypes.AUDIO, MessageTypes.VOICE].includes(message.type);
  }

  private async shouldTranscribe(message: Message): Promise<boolean> {
    if (!this.isAudioMessage(message)) {
      return false;
    }
    logger.debug(
      'Should transcribe: true (pending filters)',
      this.debugMessageInfo(message)
    );
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

  private isAudioMessageAndMedia(
    message: Message,
    media: MessageMedia
  ): boolean {
    if (!this.isAudioMessage(message)) {
      return false;
    }
    if (!media.mimetype.startsWith('audio/')) {
      return false;
    }
    return true;
  }

  async transcribeAndSendMessage(message: Message): Promise<void> {
    try {
      if (!message.hasMedia) return;
      const media = await message.downloadMedia();
      const contents = Buffer.from(media.data, 'base64');
      logger.debug(
        'Will try to transcribe media',
        await this.debugMessageInfo(message, media)
      );
      if (!this.isAudioMessageAndMedia(message, media)) {
        logger.warn(
          'Non-audio message made it to transcribeAndSendMessage',
          await this.debugMessageInfo(message, media)
        );
        return;
      }
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
      logger.error('Error transcribing message', e);
      logger.error('Offending message', await this.debugMessageInfo(message));
    }
  }

  async onMessage(message: Message): Promise<void> {
    logger.debug('Received message', await this.debugMessageInfo(message));
    if (await this.shouldTranscribe(message)) {
      await this.transcribeAndSendMessage(message);
    }
  }

  debugMediaInfo(media: MessageMedia): Stash {
    return {
      mimetype: media.mimetype,
      filename: media.filename,
      size: media.filesize,
    };
  }

  async debugMessageInfo(
    message: Message,
    media?: MessageMedia
  ): Promise<Stash> {
    const chat = await message.getChat();
    const chatName: string = chat.name;
    let author: string = message.from;
    if (chat.isGroup) {
      author = message.author!;
    }
    const fromContact = await message.getContact();
    const contactDisplayName = fromContact.name ?? fromContact.pushname;
    return {
      type: message.type,
      chat: chatName,
      chatId: chat.id._serialized,
      author: contactDisplayName,
      authorId: author,
      ...(media ? this.debugMediaInfo(media) : {}),
    };
  }
}
