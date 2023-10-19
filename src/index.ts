import {WhatsappClient} from './whatsapp';
import {AudioTranscriber} from './audio';
import {logger} from './logger';

const transcriber = new AudioTranscriber();

const whatsappClient = new WhatsappClient(transcriber);
whatsappClient.initialize().catch(e => {
  logger.error('Error initializing Whatsapp client', e);
});

function close() {
  logger.warn('Closing Whatsapp client');
  whatsappClient
    .close()
    .catch(e => {
      logger.error('Error closing Whatsapp client', e);
    })
    .finally(() => {
      logger.info('All done, exiting...');
    });
}

process.on('SIGINT', close);
process.on('SIGQUIT', close);
