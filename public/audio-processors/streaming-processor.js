class StreamingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = () => {
      // no-op
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (input && output) {
      for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
        output[channel].set(input[channel]);
      }
    }
    return true;
  }
}

registerProcessor('streaming-processor', StreamingProcessor);

