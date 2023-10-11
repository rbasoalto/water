import {expect} from 'chai';
import {MessageDB} from '../src/db';

describe('Test DB', () => {
  let db: MessageDB;

  beforeEach(async () => {
    db = await MessageDB.open(':memory:');
  });

  afterEach(async () => {
    await db.close();
  });

  it('should insert message', async () => {
    const db = await MessageDB.open(':memory:');
    const message_without_id = {
      wwjs_id: 'waid',
      chat_id: 'chat',
      author_id: 'author',
      body: 'body',
      timestamp: 123,
    };
    const message = await db.insertMessage(message_without_id);
    expect(message).to.deep.equal({
      ...message_without_id,
      id: 1,
    });

    const row = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM messages', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    expect(row).to.deep.equal({
      id: 1,
      wwjs_id: 'waid',
      chat_id: 'chat',
      author_id: 'author',
      body: 'body',
      timestamp: 123,
    });

    await db.close();
  });

  it('should insert media', async () => {
    const message = await db.insertMessage({
      wwjs_id: 'waid',
      chat_id: 'chat',
      author_id: 'author',
      body: 'body',
      timestamp: 123,
    });
    const media_without_id = {
      message_id: message.id,
      mime_type: 'image/png',
      filename: 'file.png',
      size: 123,
    };
    const media = await db.insertMedia(media_without_id);
    expect(media).to.deep.equal({
      ...media_without_id,
      id: 1,
    });
  });

  it('should insert transcription', async () => {
    const message = await db.insertMessage({
      wwjs_id: 'waid',
      chat_id: 'chat',
      author_id: 'author',
      body: 'body',
      timestamp: 123,
    });
    const media = await db.insertMedia({
      message_id: message.id,
      mime_type: 'image/png',
      filename: 'file.png',
      size: 123,
    });
    const transcription_without_id = {
      media_id: media.id,
      text: 'text',
    };
    const transcription = await db.insertTranscription(
      transcription_without_id
    );
    expect(transcription).to.deep.equal({
      ...transcription_without_id,
      id: 1,
    });
  });
});
