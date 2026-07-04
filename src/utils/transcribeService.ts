export async function transcribeAudio(audioBlob: Blob, apiKey?: string | null): Promise<string> {
  if (!apiKey) {
    throw new Error('No Groq API Key found for transcription. Please configure your key in Settings.');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Whisper API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.text || '';
}
