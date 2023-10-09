import {OpenAI, toFile} from 'openai';

export class AudioTranscriber {
  openai: OpenAI;

  public constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async transcribeAudio(audioContents: Buffer): Promise<string> {
    const fileLike = await toFile(audioContents, 'audio.ogg');
    const result = await this.openai.audio.transcriptions.create({
      file: fileLike,
      model: 'whisper-1',
    });
    return result.text;
  }
}
