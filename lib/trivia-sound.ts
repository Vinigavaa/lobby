/**
 * Efeitos sonoros do Trivia gerados via Web Audio API (sem arquivos de audio).
 * Best-effort: qualquer falha (bloqueio de autoplay, ambiente sem audio) e
 * silenciosamente ignorada, o som e so um reforco, nunca obrigatorio.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    return audioContext;
  } catch {
    return null;
  }
}

function playTone(
  frequency: number,
  durationSeconds: number,
  { delaySeconds = 0, gain = 0.05, type = "sine" }: {
    delaySeconds?: number;
    gain?: number;
    type?: OscillatorType;
  } = {}
) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startTime = context.currentTime + delaySeconds;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + durationSeconds
    );

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds);
  } catch {
    return;
  }
}

/** Serie de cliques decrescentes acompanhando a desaceleracao da roleta. */
export function playTriviaWheelSpinSound(totalDurationSeconds: number) {
  const tickCount = 14;

  for (let index = 0; index < tickCount; index += 1) {
    const progress = index / (tickCount - 1);
    // Cliques cada vez mais espacados, como uma roleta real desacelerando.
    const delaySeconds = totalDurationSeconds * progress ** 1.7;

    playTone(560, 0.05, { delaySeconds, gain: 0.04, type: "square" });
  }
}

/** Acorde curto ao tema ser definido. */
export function playTriviaWheelStopSound() {
  playTone(660, 0.18, { gain: 0.06 });
  playTone(880, 0.22, { delaySeconds: 0.05, gain: 0.06 });
  playTone(1046, 0.28, { delaySeconds: 0.1, gain: 0.06 });
}

export function playTriviaCorrectSound() {
  playTone(784, 0.15, { gain: 0.06 });
  playTone(988, 0.2, { delaySeconds: 0.08, gain: 0.06 });
}

export function playTriviaIncorrectSound() {
  playTone(220, 0.25, { gain: 0.06, type: "sawtooth" });
}
