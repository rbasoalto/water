import {WhatsappClient} from './whatsapp';
import {AudioTranscriber} from './audio';
import {logger} from './logger';

const transcriber = new AudioTranscriber();

const whatsappClient = new WhatsappClient(transcriber);
whatsappClient.initialize().catch(e => {
  logger.error('Error initializing Whatsapp client', e);
});
