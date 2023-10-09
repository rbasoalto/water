import cfg from 'config';

type MessageMode = 'self' | 'reply';

export type WhatsappConfig = {
  transcription: {
    allowAll: boolean;
    whitelist: string[];
    blacklist: string[];
    message: {
      mode: MessageMode;
      template: string;
    };
  };
};

export type OpenAIConfig = {
  apiKey: string;
};

export type Config = {
  openai: OpenAIConfig;
  whatsapp: WhatsappConfig;
};

export const config: Config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  whatsapp: {
    transcription: {
      allowAll: cfg.get<boolean>('whatsapp.transcription.allowAll'),
      whitelist: cfg.get<string[]>('whatsapp.transcription.whitelist'),
      blacklist: cfg.get<string[]>('whatsapp.transcription.blacklist'),
      message: {
        mode: cfg.get<MessageMode>('whatsapp.transcription.message.mode'),
        template: cfg.get<string>('whatsapp.transcription.message.template'),
      },
    },
  },
};
