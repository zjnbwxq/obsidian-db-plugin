import { DatabaseField } from '../types';

export function renderAcousticCell(td: HTMLElement, cell: any, field: DatabaseField) {
  td.addClass('acoustic-cell');
  td.setAttribute('data-type', field.type);

  switch (field.type) {
    case 'audio_signal':
      renderAudioSignal(td, cell, field);
      break;
    case 'frequency_response':
      renderFrequencyResponse(td, cell, field);
      break;
    case 'sound_pressure_level':
      renderSoundPressureLevel(td, cell, field);
      break;
    default:
      td.setText(String(cell));
  }
}

function renderAudioSignal(td: HTMLElement, signal: string, field: DatabaseField) {
  const samples = signal.split(';').map(Number);
  const sampleRate = field.sampleRate || 44100;
  const duration = samples.length / sampleRate;
  td.setText(`Audio: ${duration.toFixed(2)}s`);
  td.setAttribute('title', `
Duration: ${duration.toFixed(2)} seconds
Sample Rate: ${sampleRate} Hz
Samples: ${samples.length}
Min Amplitude: ${Math.min(...samples).toFixed(2)}
Max Amplitude: ${Math.max(...samples).toFixed(2)}
  `.trim());
}

function renderFrequencyResponse(td: HTMLElement, response: string, field: DatabaseField) {
  const points = response.split(';').map(point => point.split('|').map(Number));
  const minFreq = points[0][0];
  const maxFreq = points[points.length - 1][0];
  td.setText(`Freq Response: ${minFreq}-${maxFreq}Hz`);
  td.setAttribute('title', `
Frequency Range: ${minFreq} Hz - ${maxFreq} Hz
Points: ${points.length}
Min Magnitude: ${Math.min(...points.map(p => p[1])).toFixed(2)} dB
Max Magnitude: ${Math.max(...points.map(p => p[1])).toFixed(2)} dB
  `.trim());
}

function renderSoundPressureLevel(td: HTMLElement, spl: number, field: DatabaseField) {
  td.setText(`${spl.toFixed(1)} dB`);
  let description = '';
  if (spl < 20) description = 'Barely audible';
  else if (spl < 40) description = 'Quiet';
  else if (spl < 60) description = 'Moderate';
  else if (spl < 80) description = 'Loud';
  else if (spl < 100) description = 'Very loud';
  else description = 'Extremely loud';
  td.setAttribute('title', `
Sound Pressure Level: ${spl.toFixed(1)} dB
Description: ${description}

Reference levels:
0 dB: Threshold of hearing
20 dB: Whisper
60 dB: Normal conversation
90 dB: Lawn mower
120 dB: Rock concert
140 dB: Threshold of pain
  `.trim());
}
