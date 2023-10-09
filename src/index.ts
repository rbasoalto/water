import {WhatsappClient} from './whatsapp';
import {AudioTranscriber} from './audio';

const transcriber = new AudioTranscriber();

const whatsappClient = new WhatsappClient(transcriber);
whatsappClient.initialize();
