import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { installScratchMock } from './helpers/mock-scratch.js';

const { mock } = installScratchMock();
let extension;
mock.extensions.register = instance => {
  extension = instance;
};

await import('../src/01-core.js');

after(() => {
  try {
    if (extension && typeof extension.destroy === 'function') extension.destroy();
  } catch (_e) {
    // ignore
  }
});

function createInstance() {
  const instance = new extension.constructor();
  instance._trimDOMToRows = () => {};
  instance._trimDOMByHeight = () => {};
  if (instance.scrollArea) {
    instance.scrollArea.offsetParent = {};
    instance.scrollArea.style.display = 'flex';
  }
  return instance;
}

async function withInstance(run) {
  const instance = createInstance();
  try {
    await run(instance);
  } finally {
    if (instance && typeof instance.destroy === 'function') instance.destroy();
  }
}

async function captureConsoleError(run) {
  const original = console.error;
  const calls = [];
  console.error = (...args) => {
    calls.push(args.map(String).join(' '));
  };
  try {
    await run();
  } finally {
    console.error = original;
  }
  return calls;
}

describe('Slate core registration', () => {
  it('registers an extension instance with Scratch', () => {
    assert.ok(extension, 'Scratch.extensions.register should have been called');
  });

  it('exposes expected extension metadata', () => {
    const info = extension.getInfo();
    assert.equal(info.id, 'triflareSlate');
    assert.equal(info.name, 'Slate');
    assert.ok(Array.isArray(info.blocks) && info.blocks.length > 0);
    assert.ok(info.menus.LOG_TYPE_MENU.items.includes('loading'));
    assert.equal(info.menus.COMMAND_MENU.items, '_getCommands');
  });

  it('provides handlers for all declared block opcodes', () => {
    const blocks = extension
      .getInfo()
      .blocks.filter(block => block && typeof block === 'object' && block.opcode);
    for (const block of blocks) {
      assert.equal(
        typeof extension[block.opcode],
        'function',
        `missing method for opcode ${block.opcode}`
      );
    }
  });
});

describe('Slate utility helpers', () => {
  it('strips rich-text control markers', () =>
    withInstance(instance => {
      const input = '@c #fff:Hello@c @b:world@b @h red:!@h';
      assert.equal(instance.stripRichText(input), 'Helloworld !');
    }));

  it('validates and normalizes boolean-like values', () =>
    withInstance(instance => {
      assert.equal(instance._toYesNoBoolean('yes'), true);
      assert.equal(instance._toYesNoBoolean('1'), true);
      assert.equal(instance._toYesNoBoolean('no'), false);
      assert.equal(instance._toYesNoBoolean(''), false);
      assert.equal(instance._toYesNoBoolean('anything-else'), false);
    }));

  it('validates flag token and name syntax', () =>
    withInstance(instance => {
      assert.equal(instance._isFlagToken('--verbose'), true);
      assert.equal(instance._isFlagToken('-v'), true);
      assert.equal(instance._isFlagToken('-vv'), false);
      assert.equal(instance._isFlagToken('--1bad'), false);

      assert.equal(instance._isFlagName('dry-run'), true);
      assert.equal(instance._isFlagName('x'), true);
      assert.equal(instance._isFlagName('1bad'), false);
    }));

  it('rejects reserved or invalid command tokens', () =>
    withInstance(instance => {
      assert.equal(instance._isValidCmdOrSubToken('deploy'), true);
      assert.equal(instance._isValidCmdOrSubToken('help'), false);
      assert.equal(instance._isValidCmdOrSubToken('echo'), false);
      assert.equal(instance._isValidCmdOrSubToken('bad name'), false);
      assert.equal(instance._isValidCmdOrSubToken('bad|pipe'), false);
      assert.equal(instance._isValidCmdOrSubToken('bad&&and'), false);
    }));

  it('suggests close command names using Levenshtein distance', () =>
    withInstance(instance => {
      instance.registerCommand({ CMD: 'deploy', DESC: 'Deploy app' });
      instance.registerCommand({ CMD: 'status', DESC: 'Show status' });
      assert.equal(instance.getClosestCommand('deply'), 'deploy');
      assert.equal(instance.getClosestCommand('zzzzzz'), null);
    }));

  it('tokenizes arguments with quotes, empty strings, and escaped quotes', () =>
    withInstance(instance => {
      assert.deepEqual(instance._tokenizeArgs('run "hello world" "" C:\\Temp\\new'), [
        'run',
        'hello world',
        '',
        'C:\\Temp\\new',
      ]);

      assert.deepEqual(instance._tokenizeArgs('echo "a \\"quoted\\" value"'), [
        'echo',
        'a "quoted" value',
      ]);
    }));

  it('tokenizes pipelines while preserving quoted delimiters', () =>
    withInstance(instance => {
      const tokens = instance._tokenizePipeline('echo "a|b && c" && next | final');
      assert.deepEqual(tokens, ['echo "a|b && c"', '&&', 'next', '|', 'final']);
    }));

  it('formats timers and sprite names to fixed display widths', () =>
    withInstance(instance => {
      assert.equal(instance._formatTimerStr(0.016), '[0.016000]');
      assert.equal(instance._formatTimerStr(10.016), '[10.01600]');
      assert.equal(instance._formatTimerStr(12345678), '[12345678]');

      assert.equal(instance._formatSpriteName('Sprite'), 'Sprite    ');
      assert.equal(instance._formatSpriteName('LongSpriteName'), 'LongSpr...');
    }));

  it('waits for done threads and times out for stuck threads', async () => {
    await withInstance(async instance => {
      await instance._waitForThreads([{ status: 4 }], 50);
      await assert.rejects(instance._waitForThreads([{ status: 1 }], 30), /Timed out waiting/);
    });
  });
});

describe('Slate ring buffer and history behavior', () => {
  it('wraps at 1000 entries and preserves newest lines', () =>
    withInstance(instance => {
      for (let i = 0; i < 1002; i++) {
        instance._ringPush(`L${i}`);
      }
      assert.equal(instance._ringSize, 1000);
      assert.equal(instance._ringGet(0), 'L2');
      assert.equal(instance._ringGet(999), 'L1001');
    }));

  it('splits multiline entries into distinct ring lines', () =>
    withInstance(instance => {
      instance._ringPush('first\nsecond');
      assert.equal(instance._ringSize, 2);
      assert.equal(instance._ringGet(0), 'first');
      assert.equal(instance._ringGet(1), 'second');
    }));

  it('advances by all multiline rows when full ring buffer wraps', () =>
    withInstance(instance => {
      for (let i = 0; i < 1000; i++) {
        instance._ringPush(`L${i}`);
      }
      instance._ringPush('A\nB');
      assert.equal(instance._ringSize, 1000);
      assert.equal(instance._ringGet(0), 'L2');
      assert.equal(instance._ringGet(998), 'A');
      assert.equal(instance._ringGet(999), 'B');
    }));

  it('builds output history from ring entries plus active line', () =>
    withInstance(instance => {
      instance._ringPush('first');
      instance._ringPush({ type: 'header', text: 'HEADER' });
      instance.currentHistoryLine = 'active-line';
      instance.currentLineDiv = {};

      assert.equal(instance.getTerminalInfo({ INFO: 'output history' }), 'first\nHEADER\nactive-line');
    }));

  it('normalizes loading ring entries to done-frame text', () =>
    withInstance(instance => {
      const text = instance._ringEntryText({
        type: 'loading',
        timerStr: '[1.000000]',
        spriteName: 'Sprite1   ',
        message: 'compiling',
      });
      assert.match(text, /\[ = \]/);
      assert.match(text, /compiling/);
    }));
});

describe('Slate command registry and parameters', () => {
  it('registers commands and subcommands, and updates descriptions', () =>
    withInstance(instance => {
      instance.registerCommand({ CMD: 'system', DESC: 'System command' });
      instance.registerSubcommand({ CMD: 'system', SUB: 'info', DESC: 'Show info' });
      instance.registerSubcommand({ CMD: 'system', SUB: 'info', DESC: 'Updated info' });

      assert.equal(instance.commands.system.description, 'System command');
      assert.equal(instance.commands.system.subcommands.info.description, 'Updated info');
    }));

  it('rejects invalid or reserved command names', async () => {
    await withInstance(async instance => {
      const errors = await captureConsoleError(async () => {
        instance.registerCommand({ CMD: 'help', DESC: 'reserved' });
        instance.registerSubcommand({ CMD: 'echo', SUB: 'x', DESC: 'reserved' });
      });

      assert.equal(instance.commands.help, undefined);
      assert.equal(instance.commands.echo, undefined);
      assert.ok(errors.some(msg => msg.includes('invalid or reserved')));
    });
  });

  it('adds and updates arguments and flags with validation', async () => {
    await withInstance(async instance => {
      instance.addParam({
        TYPE: 'argument',
        NAME: 'target',
        CMD: 'deploy',
        SUB: '',
        DESC: 'Deployment target',
        REQ: 'yes',
      });
      instance.addParam({
        TYPE: 'flag',
        NAME: 'dry-run',
        CMD: 'deploy',
        SUB: '',
        DESC: 'Dry run',
        REQ: 'no',
      });
      instance.addParam({
        TYPE: 'flag',
        NAME: 'dry-run',
        CMD: 'deploy',
        SUB: '',
        DESC: 'Simulate only',
        REQ: 'no',
      });

      assert.equal(instance.commands.deploy.args[0].required, true);
      assert.equal(instance.commands.deploy.flags[0].desc, 'Simulate only');

      const errors = await captureConsoleError(async () => {
        instance.addParam({
          TYPE: 'flag',
          NAME: '123bad',
          CMD: 'deploy',
          SUB: '',
          DESC: 'bad',
          REQ: 'no',
        });
      });

      assert.ok(errors.some(msg => msg.includes('invalid flag name')));
    });
  });

  it('returns dynamic command and subcommand menus with fallbacks', () =>
    withInstance(instance => {
      assert.deepEqual(instance._getCommands(), ['help']);
      assert.deepEqual(instance._getSubcommands(), ['info']);

      instance.registerSubcommand({ CMD: 'alpha', SUB: 'one', DESC: 'one' });
      instance.registerSubcommand({ CMD: 'beta', SUB: 'one', DESC: 'still one' });
      instance.registerSubcommand({ CMD: 'beta', SUB: 'two', DESC: 'two' });

      assert.deepEqual(instance._getCommands().sort(), ['alpha', 'beta']);
      assert.deepEqual(instance._getSubcommands().sort(), ['one', 'two']);
    }));
});

describe('Slate command execution and pipelines', () => {
  it('supports built-in echo with piped input and explicit args', async () => {
    await withInstance(async instance => {
      const lines = [];
      instance._printInternal = line => lines.push(String(line));

      const fromPipe = await instance.handleCommand('echo', 'pipe-value');
      assert.deepEqual(fromPipe, { success: true, output: 'pipe-value' });

      const fromArgs = await instance.handleCommand('echo hello world', 'ignored');
      assert.deepEqual(fromArgs, { success: true, output: 'hello world' });
      assert.deepEqual(lines, ['pipe-value', 'hello world']);
    });
  });

  it('returns a helpful message for unknown commands', async () => {
    await withInstance(async instance => {
      instance.registerCommand({ CMD: 'deploy', DESC: 'Deploy app' });
      const lines = [];
      instance._printInternal = line => lines.push(String(line));

      const result = await instance.handleCommand('deply');
      assert.equal(result.success, false);
      assert.ok(lines.some(line => line.includes('Command not found: deply')));
      assert.ok(lines.some(line => line.includes('Did you mean')));
    });
  });

  it('parses positional args, merged trailing args, and flags', async () => {
    await withInstance(async instance => {
      instance.registerCommand({ CMD: 'run', DESC: 'Run command' });
      instance.addParam({
        TYPE: 'argument',
        NAME: 'target',
        CMD: 'run',
        SUB: '',
        DESC: 'Target',
        REQ: 'yes',
      });
      instance.addParam({
        TYPE: 'argument',
        NAME: 'message',
        CMD: 'run',
        SUB: '',
        DESC: 'Message',
        REQ: 'no',
      });

      const result = await instance.handleCommand('run alpha one two --dry --retries 3 -v');
      assert.equal(result.success, true);
      assert.equal(instance.currentParsedArgs.target, 'alpha');
      assert.equal(instance.currentParsedArgs.message, 'one two');
      assert.equal(instance.currentParsedFlags.dry, true);
      assert.equal(instance.currentParsedFlags.retries, '3');
      assert.equal(instance.currentParsedFlags.v, true);

      assert.equal(instance.getParam({ TYPE: 'argument', NAME: 'target' }), 'alpha');
      assert.equal(instance.getParam({ TYPE: 'flag', NAME: 'retries' }), '3');
    });
  });

  it('queries missing required args and dispatches correct hat blocks', async () => {
    await withInstance(async instance => {
      const originalVm = globalThis.Scratch.vm;
      const hatCalls = [];
      globalThis.Scratch.vm = {
        runtime: {
          startHats(opcode, args) {
            hatCalls.push({ opcode, args });
            return [];
          },
        },
      };

      try {
        instance.registerCommand({ CMD: 'system', DESC: 'System' });
        instance.registerSubcommand({ CMD: 'system', SUB: 'info', DESC: 'Info' });
        instance.addParam({
          TYPE: 'argument',
          NAME: 'target',
          CMD: 'system',
          SUB: '',
          DESC: 'Target',
          REQ: 'yes',
        });

        const prompts = [];
        instance.queryUser = async ({ PROMPT }) => {
          prompts.push(PROMPT);
          return 'from-prompt';
        };

        const commandResult = await instance.handleCommand('system');
        assert.equal(commandResult.success, true);
        assert.equal(instance.currentParsedArgs.target, 'from-prompt');

        const subcommandResult = await instance.handleCommand('system info');
        assert.equal(subcommandResult.success, true);

        assert.ok(prompts.some(prompt => prompt.includes('Missing required arg <target>:')));
        assert.equal(hatCalls[0].opcode, 'triflareSlate_whenCommand');
        assert.deepEqual(hatCalls[0].args, { CMD: 'system' });
        assert.equal(hatCalls[1].opcode, 'triflareSlate_whenSubcommand');
        assert.deepEqual(hatCalls[1].args, { CMD: 'system', SUB: 'info' });
      } finally {
        globalThis.Scratch.vm = originalVm;
      }
    });
  });

  it('chains pipelines and respects && gating semantics', async () => {
    await withInstance(async instance => {
      const calls = [];
      let resetCalled = 0;

      instance.handleCommand = async (token, pipedInput) => {
        calls.push({ token, pipedInput });
        if (token === 'bad') return { success: false, output: 'bad-output' };
        return { success: true, output: `${token}-out` };
      };
      instance._resetPromptIfReady = () => {
        resetCalled++;
      };

      await instance.processInputQueue('one | two && bad && skipped | three');

      assert.equal(instance.isExecutingCommand, false);
      assert.equal(resetCalled, 1);
      assert.deepEqual(calls, [
        { token: 'one', pipedInput: '' },
        { token: 'two', pipedInput: 'one-out' },
        { token: 'bad', pipedInput: '' },
        { token: 'three', pipedInput: '' },
      ]);
    });
  });

  it('reports pipeline errors and always resets prompt state', async () => {
    await withInstance(async instance => {
      const lines = [];
      let resetCalled = 0;

      instance.handleCommand = async () => {
        throw new Error('boom');
      };
      instance._printInternal = line => lines.push(String(line));
      instance._resetPromptIfReady = () => {
        resetCalled++;
      };

      await instance.processInputQueue('explode');
      assert.equal(instance.isExecutingCommand, false);
      assert.equal(resetCalled, 1);
      assert.ok(lines.some(line => line.includes('Pipeline Error: boom')));
    });
  });
});

describe('Slate rich text, logging, and display controls', () => {
  it('parses rich text safely and sanitizes unsafe color values', () =>
    withInstance(instance => {
      const parsed = instance.parseRichText(
        '@c red:<b>x</b>@c @h accent:hi@h @b:bold@b @i:it@i @u:u@u'
      );
      assert.match(parsed, /&lt;b&gt;x&lt;\/b&gt;/);
      assert.match(parsed, /color: red/);
      assert.match(parsed, /background-color: var\(--slate-accent\)/);
      assert.match(parsed, /<strong>bold<\/strong>/);
      assert.match(parsed, /<em>it<\/em>/);
      assert.match(parsed, /text-decoration: underline/);

      const sanitized = instance.parseRichText('@c red";background:url(x):oops@c');
      assert.match(sanitized, /color: inherit/);
    }));

  it('formats text wrappers for style variants', () =>
    withInstance(instance => {
      assert.equal(
        instance.formatText({ TEXT: 'A', COLOR: '#ff0', STYLE: 'bold' }),
        '@c #ff0:@b:A@b@c'
      );
      assert.equal(
        instance.formatText({ TEXT: 'A', COLOR: '#ff0', STYLE: 'italic' }),
        '@c #ff0:@i:A@i@c'
      );
      assert.equal(
        instance.formatText({ TEXT: 'A', COLOR: '#ff0', STYLE: 'underline' }),
        '@c #ff0:@u:A@u@c'
      );
      assert.equal(
        instance.formatText({ TEXT: 'A', COLOR: '#ff0', STYLE: 'highlight' }),
        '@h #ff0:A@h'
      );
      assert.equal(
        instance.formatText({ TEXT: 'A', COLOR: '#ff0', STYLE: 'normal' }),
        '@c #ff0:A@c'
      );
    }));

  it('updates loading state transitions and suppresses debug logs when disabled', () =>
    withInstance(instance => {
      const lines = [];
      let stopCalls = 0;
      instance._printInternal = line => lines.push(String(line));
      instance._startLoadingAnimation = () => {};
      instance._stopLoadingAnimation = () => {
        stopCalls++;
      };
      instance._resolveLoadingLinesInDOM = () => {};
      instance.autoScroll = false;
      instance.scrollOffset = 1;

      instance.SlateConfig.debugEnabled = false;
      instance._slateLog('debug', 'Sprite1', 'hidden debug');
      assert.equal(lines.length, 0);

      instance._slateLog('loading', 'Sprite1', 'build');
      assert.equal(instance.isLoading, true);
      assert.equal(instance._activeTasks.length, 1);
      assert.equal(instance._ringSize, 1);

      instance._slateLog('success', 'Sprite1', 'done');
      assert.equal(instance.isLoading, false);
      assert.equal(instance._activeTasks.length, 0);
      assert.equal(stopCalls, 1);
      assert.ok(lines.some(line => line.includes('{ √ }')));
    }));

  it('resolves sprite names from util.target and delegates to _slateLog', () =>
    withInstance(instance => {
      const calls = [];
      instance._slateLog = (type, sprite, message) => {
        calls.push({ type, sprite, message });
      };

      instance.slateLog({ TYPE: 'warning', MESSAGE: 'from name' }, { target: { name: 'Cat' } });
      instance.slateLog(
        { TYPE: 'hint', MESSAGE: 'from getName' },
        { target: { getName: () => 'Dog' } }
      );

      assert.deepEqual(calls, [
        { type: 'warning', sprite: 'Cat', message: 'from name' },
        { type: 'hint', sprite: 'Dog', message: 'from getName' },
      ]);
    }));

  it('applies terminal property and color updates', () =>
    withInstance(instance => {
      instance.setTerminalProperty({ PROP: 'prompt visibility', VALUE: 'false' });
      assert.equal(instance.promptEnabled, false);
      assert.equal(instance.inputArea.style.display, 'none');

      instance.setTerminalProperty({ PROP: 'prompt visibility', VALUE: 'enable' });
      assert.equal(instance.promptEnabled, true);
      assert.equal(instance.inputArea.style.display, 'block');

      instance.setTerminalProperty({ PROP: 'width', VALUE: '640' });
      assert.equal(instance.container.style.width, '640px');

      instance.setTerminalProperty({ PROP: 'width', VALUE: '75%' });
      assert.equal(instance.container.style.width, '75%');

      instance._lastScrollDirection = 'up';
      instance.setTerminalProperty({ PROP: 'alt-buffer', VALUE: 'false' });
      assert.equal(instance.isAltBuffer, false);
      assert.equal(instance._lastScrollDirection, '');

      instance.setTerminalProperty({ PROP: 'debug logging', VALUE: 'true' });
      assert.equal(instance.SlateConfig.debugEnabled, true);

      instance.setColors({ BG: 'rgb(1, 2, 3)', FG: '#eeeeee', ACC: '#123456' });
      assert.equal(instance.container.style.backgroundColor, 'rgba(1, 2, 3, 1)');
      assert.equal(instance.container.style.color, '#eeeeee');
      assert.equal(instance.cursor.style.backgroundColor, '#eeeeee');
      assert.equal(instance.currentConfig.accentColor, '#123456');
    }));

  it('handles action dispatch and scroll direction consumption', () =>
    withInstance(instance => {
      const seen = [];
      instance.show = () => seen.push('show');
      instance.hide = () => seen.push('hide');
      instance.clear = () => seen.push('clear');
      instance.toggleMaximize = () => seen.push('maximize');
      instance.toggleMinimize = () => seen.push('minimize');

      instance.doAction({ ACTION: 'show' });
      instance.doAction({ ACTION: 'hide' });
      instance.doAction({ ACTION: 'clear' });
      instance.doAction({ ACTION: 'maximize' });
      instance.doAction({ ACTION: 'minimize' });
      instance.isMaximized = true;
      instance.isMinimized = true;
      instance.doAction({ ACTION: 'restore' });

      assert.deepEqual(seen, ['show', 'hide', 'clear', 'maximize', 'minimize', 'maximize', 'minimize']);

      instance._lastScrollDirection = 'down';
      assert.equal(instance.getTerminalInfo({ INFO: 'scroll direction' }), 'down');
      assert.equal(instance.getTerminalInfo({ INFO: 'scroll direction' }), '');
    }));
});

describe('Slate query and lifecycle cleanup', () => {
  it('resolves pending queries when hide() is called', async () => {
    await withInstance(async instance => {
      const pending = instance.queryUser({ PROMPT: 'Password:', TYPE: 'password' });
      assert.equal(instance._passwordMode, true);
      assert.equal(instance.cursor.textContent, '*');

      instance.hide();

      const answer = await pending;
      assert.equal(answer, '');
      assert.equal(instance.resolveInput, null);
      assert.equal(instance._passwordMode, false);
      assert.equal(instance.container.style.display, 'none');
    });
  });

  it('setCommandOutput stores explicit command output for piping', () =>
    withInstance(instance => {
      instance.setCommandOutput({ TEXT: 'result-value' });
      assert.equal(instance.currentOutput, 'result-value');
    }));

  it('destroy() resolves pending input and clears large references', () => {
    const instance = createInstance();
    const body = globalThis.document.body;
    const host = instance.host;
    let resolvedWith = null;

    instance.resolveInput = value => {
      resolvedWith = value;
    };
    assert.ok(body.children.includes(host));

    instance.destroy();

    assert.equal(resolvedWith, '');
    assert.equal(instance._disposed, true);
    assert.equal(instance.container, null);
    assert.equal(instance.outputDiv, null);
    assert.equal(instance.hiddenInput, null);
    assert.equal(instance._ringBuf, null);
    assert.equal(body.children.includes(host), false);
  });
});
