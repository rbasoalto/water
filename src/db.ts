import {Database} from 'sqlite3';

export type PObject = {
  id?: number;
};

export type PRObject = PObject & {id: number};

export type PMessage = PObject & {
  wwjs_id: string;
  chat_id: string;
  author_id: string;
  body: string;
  timestamp: number;
};

export type PRMessage = PMessage & PRObject;

export type PMedia = PObject & {
  message_id: number;
  mime_type: string;
  filename: string;
  size: number;
};

export type PRMedia = PMedia & PRObject;

export type PTranscription = PObject & {
  media_id: number;
  text: string;
};

export type PRTranscription = PTranscription & PRObject;

type RunResult = {
  lastID: number;
  changes: number;
};

export class MessageDB {
  private constructor(public db: Database) {}

  public static async open(filename: string): Promise<MessageDB> {
    const db = await new Promise<MessageDB>((resolve, reject) => {
      const db = new Database(filename, err => {
        if (err) {
          reject(err);
        } else {
          resolve(new MessageDB(db));
        }
      });
    });
    await db.initialize();
    return db;
  }

  private async initialize() {
    await this.run(
      'CREATE TABLE IF NOT EXISTS messages (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'wwjs_id TEXT, ' +
        'chat_id TEXT, ' +
        'author_id TEXT, ' +
        'body TEXT, ' +
        'timestamp INTEGER ' +
        ')'
    );
    await this.run(
      'CREATE TABLE IF NOT EXISTS media (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'message_id INTEGER, ' +
        'mime_type TEXT, ' +
        'filename TEXT, ' +
        'size INTEGER, ' +
        'FOREIGN KEY(message_id) REFERENCES messages(id) ' +
        ')'
    );
    await this.run(
      'CREATE TABLE IF NOT EXISTS transcriptions (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'media_id INTEGER, ' +
        'text TEXT, ' +
        'FOREIGN KEY(media_id) REFERENCES media(id) ' +
        ')'
    );
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
          this.db = null;
        }
      });
    });
  }

  public async insertMessage(message: PMessage): Promise<PRMessage> {
    const result = await this.run(
      'INSERT INTO messages (wwjs_id, chat_id, author_id, body, timestamp) VALUES (?, ?, ?, ?, ?)',
      message.wwjs_id,
      message.chat_id,
      message.author_id,
      message.body,
      message.timestamp
    );
    return {
      ...message,
      id: result.lastID,
    };
  }

  public async insertMedia(media: PMedia): Promise<PRMedia> {
    const result = await this.run(
      'INSERT INTO media (message_id, mime_type, filename, size) VALUES (?, ?, ?, ?)',
      media.message_id,
      media.mime_type,
      media.filename,
      media.size
    );
    return {
      ...media,
      id: result.lastID,
    };
  }

  public async insertTranscription(
    transcription: PTranscription
  ): Promise<PRTranscription> {
    const result = await this.run(
      'INSERT INTO transcriptions (media_id, text) VALUES (?, ?)',
      transcription.media_id,
      transcription.text
    );
    return {
      ...transcription,
      id: result.lastID,
    };
  }

  private async run(sql: string, ...params: any[]): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (_, error) {
        if (error) {
          reject(error);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes,
          });
        }
      });
    });
  }
}
