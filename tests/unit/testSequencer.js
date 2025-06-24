const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Sort tests by file path to ensure consistent execution order
    return tests.sort((testA, testB) =>
      testA.path > testB.path ? 1 : -1
    );
  }
}

module.exports = CustomSequencer;