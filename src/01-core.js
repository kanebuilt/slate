const STATUS_DONE = 4;
const DEFAULT_MAX_WAIT_MS = 30000;
const RING_BUFFER_SIZE = 1000;
const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

// Global configuration for the Slate logging system.
const SlateConfig = { debugEnabled: false };

// Animation frames for the loading log type tag (cycles every 100 ms).
const LOADING_FRAMES = ['[=  ]', '[== ]', '[===]', '[ ==]', '[  =]', '[   ]'];
// Frame shown once a loading task has been resolved (success or error).
const LOADING_DONE_FRAME = '[ = ]';

// Log type definitions: tag text (exactly 5 chars), display color, and darker sprite-name color.
const LOG_TYPES = {
  info: { tag: '( i )', color: '#5865f2', spriteColor: '#3d4bc4' },
  hint: { tag: '{ i }', color: '#00b0c0', spriteColor: '#007a85' },
  loading: { tag: LOADING_FRAMES[0], color: '#00b0c0', spriteColor: '#007a85' },
  success: { tag: '{ √ }', color: '#57f287', spriteColor: '#2da058' },
  warning: { tag: '[ ! ]', color: '#fee75c', spriteColor: '#c9b82a' },
  error: { tag: '< X >', color: '#ed4245', spriteColor: '#b02020' },
  debug: { tag: '{ * }', color: '#eb459e', spriteColor: '#b02070' },
};
class triflareSlate {
  /* global __ASSET__ */

  getInfo() {
    const menuIconURI = typeof __ASSET__ === 'undefined' ? '' : __ASSET__('logo.svg');
    return {
      id: 'triflareSlate',
      name: Scratch.translate('Slate'),
      menuIconURI,
      color1: '#7289da',
      color2: '#687dc5',
      color3: '#414d79',
      blocks: [
        {
          opcode: 'doAction',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('[ACTION] terminal'),
          arguments: {
            ACTION: { type: Scratch.ArgumentType.STRING, menu: 'ACTION_MENU' },
          },
        },
        {
          opcode: 'print',
          blockType: Scratch.BlockType.COMMAND,
          hideFromPalette: true,
          text: Scratch.translate('print [TEXT]'),
          arguments: {
            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello, World!' },
          },
        },
        {
          opcode: 'write',
          blockType: Scratch.BlockType.COMMAND,
          hideFromPalette: true,
          text: Scratch.translate('write [TEXT] inline'),
          arguments: {
            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Loading...' },
          },
        },
        {
          opcode: 'printHeader',
          blockType: Scratch.BlockType.COMMAND,
          hideFromPalette: true,
          text: Scratch.translate('print header [TEXT]'),
          arguments: {
            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'SYSTEM MENU' },
          },
        },
        {
          opcode: 'formatText',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('format [TEXT] color [COLOR] style [STYLE]'),
          arguments: {
            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Warning' },
            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#ffbd2e' },
            STYLE: { type: Scratch.ArgumentType.STRING, menu: 'STYLE_MENU' },
          },
        },
        {
          opcode: 'slateLog',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('log [TYPE] for current sprite: [MESSAGE]'),
          arguments: {
            TYPE: {
              type: Scratch.ArgumentType.STRING,
              menu: 'LOG_TYPE_MENU',
              defaultValue: 'info',
            },
            MESSAGE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Task started' },
          },
        },
        {
          opcode: 'getTerminalInfo',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('terminal [INFO]'),
          arguments: { INFO: { type: Scratch.ArgumentType.STRING, menu: 'INFO_MENU' } },
        },
        '---',
        {
          opcode: 'queryUser',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('query user with [PROMPT] type [TYPE] and wait'),
          arguments: {
            PROMPT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Enter value:' },
            TYPE: {
              type: Scratch.ArgumentType.STRING,
              menu: 'QUERY_TYPE_MENU',
              defaultValue: 'text',
            },
          },
        },
        '---',
        {
          opcode: 'setCommandOutput',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('set command output [TEXT]'),
          arguments: {
            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'result' },
          },
        },
        '---',
        {
          opcode: 'registerCommand',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('register command [CMD] desc [DESC]'),
          arguments: {
            CMD: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DESC: { type: Scratch.ArgumentType.STRING, defaultValue: 'Shows help menu' },
          },
        },
        {
          opcode: 'registerSubcommand',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate(
            'register subcommand [SUB] under cmd [CMD] desc [DESC]'
          ),
          arguments: {
            SUB: { type: Scratch.ArgumentType.STRING, defaultValue: 'info' },
            CMD: { type: Scratch.ArgumentType.STRING, defaultValue: 'system' },
            DESC: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'Shows system info',
            },
          },
        },
        {
          opcode: 'addParam',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate(
            'add [TYPE] [NAME] to cmd [CMD] subcmd [SUB] desc [DESC] req? [REQ]'
          ),
          arguments: {
            TYPE: { type: Scratch.ArgumentType.STRING, menu: 'PARAM_TYPE' },
            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'target' },
            CMD: { type: Scratch.ArgumentType.STRING, defaultValue: 'ping' },
            SUB: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DESC: { type: Scratch.ArgumentType.STRING, defaultValue: 'Target to ping' },
            REQ: {
              type: Scratch.ArgumentType.STRING,
              menu: 'YES_NO_MENU',
              defaultValue: 'no',
            },
          },
        },
        {
          opcode: 'whenCommand',
          blockType: Scratch.BlockType.HAT,
          text: Scratch.translate('when command [CMD] runs'),
          isEdgeActivated: false,
          shouldRestartExistingThreads: true,
          arguments: { CMD: { type: Scratch.ArgumentType.STRING, menu: 'COMMAND_MENU' } },
        },
        {
          opcode: 'whenSubcommand',
          blockType: Scratch.BlockType.HAT,
          text: Scratch.translate('when command [CMD] subcommand [SUB] runs'),
          isEdgeActivated: false,
          shouldRestartExistingThreads: true,
          arguments: {
            CMD: { type: Scratch.ArgumentType.STRING, menu: 'COMMAND_MENU' },
            SUB: { type: Scratch.ArgumentType.STRING, menu: 'SUBCOMMAND_MENU' },
          },
        },
        {
          opcode: 'getParam',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('value of [TYPE] [NAME]'),
          arguments: {
            TYPE: { type: Scratch.ArgumentType.STRING, menu: 'PARAM_TYPE' },
            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'target' },
          },
        },
        '---',
        {
          opcode: 'setTerminalProperty',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('set terminal [PROP] to [VALUE]'),
          arguments: {
            PROP: { type: Scratch.ArgumentType.STRING, menu: 'PROPS_MENU' },
            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '100%' },
          },
        },
        {
          opcode: 'setColors',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('set colors: bg [BG] text [FG] accent [ACC]'),
          arguments: {
            BG: { type: Scratch.ArgumentType.COLOR, defaultValue: '#1e1e20' },
            FG: { type: Scratch.ArgumentType.COLOR, defaultValue: '#e0e0e0' },
            ACC: { type: Scratch.ArgumentType.COLOR, defaultValue: '#7289da' },
          },
        },
      ],
      menus: {
        ACTION_MENU: {
          acceptReporters: true,
          items: ['show', 'hide', 'clear', 'maximize', 'minimize', 'restore'],
        },
        INFO_MENU: {
          acceptReporters: true,
          items: [
            'answer',
            'piped input', // Included for accessing pipe data
            'output history',
            'current command',
            'current subcommand',
            'is visible?',
            'is maximized?',
            'is minimized?',
            'is CLI mode?',
            'scroll offset',
            'scroll direction',
            'is alt buffer?',
          ],
        },
        QUERY_TYPE_MENU: { acceptReporters: true, items: ['text', 'password'] },
        PARAM_TYPE: { acceptReporters: true, items: ['argument', 'flag'] },
        YES_NO_MENU: { acceptReporters: true, items: ['yes', 'no'] },
        STYLE_MENU: {
          acceptReporters: true,
          items: ['normal', 'bold', 'italic', 'underline', 'highlight'],
        },
        PROPS_MENU: {
          acceptReporters: true,
          items: [
            'title',
            'prompt text',
            'prompt visibility',
            'CLI mode',
            'alt-buffer',
            'width',
            'height',
            'top',
            'left',
            'font size',
            'font family',
            'opacity',
            'border radius',
            'auto-scroll',
            'debug logging',
          ],
        },
        COMMAND_MENU: { acceptReporters: false, items: '_getCommands' },
        SUBCOMMAND_MENU: { acceptReporters: false, items: '_getSubcommands' },
        LOG_TYPE_MENU: {
          acceptReporters: true,
          items: ['info', 'hint', 'success', 'warning', 'error', 'debug', 'loading'],
        },
      },
    };
  }

  constructor() {
    this.lastInput = '';
    this.resolveInput = null;
    this.queryPrompt = '';
    this._disposed = false;
    this._passwordMode = false;
    this.defaultPrompt = 'guest@slate:~$';
    this.promptEnabled = true;
    this.queryPrompt = '';

    this.commands = Object.create(null);
    this.currentParsedArgs = Object.create(null);
    this.currentParsedFlags = Object.create(null);

    this.minimizeTimer = null;
    this._cliModeRaf = null;

    this.inputHistory = [];
    this.historyIndex = -1;
    this.maxHistoryLines = 300; // Caps keyboard input history (up/down arrow recall); unrelated to ring buffer

    // Ring buffer for scrollback history (1000 lines, wraps on overflow)
    this._ringBuf = new Array(RING_BUFFER_SIZE).fill(null);
    this._ringHead = 0; // Index of next write slot
    this._ringSize = 0; // Number of valid entries
    this.currentHistoryLine = '';
    this.currentLineDiv = null;
    this.autoScroll = true;

    // Scrollback state
    this.scrollOffset = 0; // 0 = live view; >0 = lines from bottom to look back
    this.isAltBuffer = false; // Alternate buffer mode (vim/nano): scroll redirects to arrow reporters
    this._lastScrollDirection = ''; // 'up' | 'down' | '' — set in alt buffer mode
    this._selectionPendingTrim = false; // true when a DOM trim was skipped to preserve user selection

    this.isExecutingCommand = false;
    this.currentExecutingCommand = '';
    this.currentExecutingSubcommand = '';

    // Piping state
    this.pipedInput = '';
    this.currentOutput = '';

    // Logging state
    this.isLoading = false;
    this._activeTasks = [];
    this._loadingFrameIndex = 0;
    this._loadingInterval = null;
    this._nextLoadingTaskId = 0;
    // Reference to the module-level config object so tests and external callers can reach it.
    this.SlateConfig = SlateConfig;

    // Window state
    this.isMinimized = false;
    this.isMaximized = false;
    this.isCliMode = false;
    this.savedStyles = {};
    this.currentConfig = {
      width: '600px',
      height: '400px',
      fontSize: '15px',
      fontFamily: "'Ubuntu Mono', 'Menlo', 'Consolas', monospace",
      opacity: '1',
      borderRadius: '8px',
      accentColor: '#7289da',
      background: 'rgb(18, 18, 20)',
      foreground: '#e0e0e0',
    };

    this.createDOM();
  }

  get canvas() {
    if (Scratch && Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.renderer) {
      return Scratch.vm.runtime.renderer.canvas;
    }
    return document.querySelector('canvas');
  }

  // --- UTILITIES ---

  // DRY string processing for prompt prefixes and raw text
  stripRichText(text) {
    if (!text) return '';
    return text
      .replace(/@c\s*[^:]+:/g, '')
      .replace(/@c/g, '')
      .replace(/@h\s*[^:]+:/g, '')
      .replace(/@h/g, '')
      .replace(/@[biu]:/g, '')
      .replace(/@[biu]/g, '');
  }

  // Levenshtein distance for "Did you mean?" command suggestions
  getClosestCommand(cmd) {
    let closest = null;
    let minDistance = Infinity;
    for (const c in this.commands) {
      const dist = this._levenshtein(cmd, c);
      if (dist < minDistance) {
        minDistance = dist;
        closest = c;
      }
    }
    // Threshold of 3 edits
    return minDistance <= 3 ? closest : null;
  }

  _levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(a.length + 1)
      .fill()
      .map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  // Helper: flag and token validators
  _isFlagToken(s) {
    return /^--[A-Za-z][A-Za-z0-9-]*$/.test(s) || /^-[A-Za-z]$/.test(s);
  }

  _isFlagName(name) {
    return /^[A-Za-z][A-Za-z0-9-]*$/.test(name) || /^[A-Za-z]$/.test(name);
  }

  _toYesNoBoolean(value) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (normalized === 'yes' || normalized === 'true' || normalized === '1') return true;
    if (
      normalized === 'no' ||
      normalized === 'false' ||
      normalized === '0' ||
      normalized === ''
    )
      return false;
    return false;
  }

  _isValidCmdOrSubToken(s) {
    if (!s || typeof s !== 'string') return false;
    if (s === 'help' || s === 'echo') return false;
    if (/\s|[|&]/.test(s)) return false;
    return true;
  }

  // --- RING BUFFER ---

  // Push a completed line to the ring buffer. Overwrites oldest entry when full.
  // Avoids array allocation: writes directly into a pre-allocated slot.
  _ringPush(line) {
    if (typeof line === 'string' && line.includes('\n')) {
      const lines = line.split('\n');
      for (let i = 0; i < lines.length; i++) {
        this._ringPush(lines[i]);
      }
      return;
    }
    this._ringBuf[this._ringHead] = line;
    this._ringHead = (this._ringHead + 1) % RING_BUFFER_SIZE;
    if (this._ringSize < RING_BUFFER_SIZE) this._ringSize++;
  }

  // Get a ring entry by logical index (0 = oldest, ringSize-1 = newest).
  // Returns a plain string for normal lines, or {type:'header', text:'...'} for headers.
  _ringGet(logicalIndex) {
    if (logicalIndex < 0 || logicalIndex >= this._ringSize) return '';
    const oldest =
      (this._ringHead - this._ringSize + RING_BUFFER_SIZE) % RING_BUFFER_SIZE;
    return this._ringBuf[(oldest + logicalIndex) % RING_BUFFER_SIZE] ?? '';
  }

  // Return the plain text of a ring entry for use in text-only consumers (e.g. history reporter).
  _ringEntryText(entry) {
    if (entry && typeof entry === 'object') {
      if (entry.type === 'loading') {
        const logDef = LOG_TYPES.loading;
        return `${entry.timerStr} @c ${logDef.color}:${LOADING_DONE_FRAME}@c @c ${logDef.spriteColor}:${entry.spriteName}@c: ${entry.message}`;
      }
      return entry.text ?? '';
    }
    return String(entry ?? '');
  }

  // Returns true when there is an in-progress line that has not yet been committed to the ring buffer.
  _hasActiveLine() {
    return this.currentLineDiv !== null || this.currentHistoryLine !== '';
  }

  // Restore cursor and state after a password-mode query resolves or is cancelled.
  _resetPasswordMode() {
    this._passwordMode = false;
    if (!this.cursor) return;
    this.cursor.textContent = '';
    Object.assign(this.cursor.style, {
      backgroundColor: '#e0e0e0',
      color: '',
      width: '0.6em',
      height: '1.2em',
      fontWeight: '',
    });
  }

  // Return bullet-masked display text for a password-mode value.
  _getMaskedValue(value) {
    return '\u2022'.repeat(String(value).length);
  }

  // Calculate the number of visible terminal rows from the current container dimensions.
  _getTerminalRows() {
    if (!this.scrollArea) return 24;
    const fontSize = parseFloat(this.currentConfig.fontSize) || 15;
    const lineHeight = fontSize * 1.5;
    const inputHeight = this.inputArea ? this.inputArea.offsetHeight || 0 : 0;
    const availableHeight = this.scrollArea.offsetHeight || 0;
    if (availableHeight === 0) return 24;
    return Math.max(1, Math.floor((availableHeight - inputHeight) / lineHeight));
  }

  // Estimate the number of terminal columns from the scrollArea width.
  _getTerminalCols() {
    if (!this.scrollArea) return 80;
    const fontSize = parseFloat(this.currentConfig.fontSize) || 15;
    // Monospace char width is roughly 0.6× the font size.
    const charWidth = fontSize * 0.6;
    const availableWidth = (this.scrollArea.clientWidth || 0) - 10; // subtract padding
    if (availableWidth <= 0) return 80;
    return Math.max(1, Math.floor(availableWidth / charWidth));
  }

  // Estimate how many visual rows a single ring entry occupies (accounting for word-wrap).
  // Strip rich text markup before measuring so markup tags don't inflate the character count.
  _visualRowsForEntry(entry) {
    const text = this.stripRichText(this._ringEntryText(entry));
    const cols = this._getTerminalCols();
    if (cols <= 0 || text.length === 0) return 1;
    const lines = text.split('\n');
    let visualRows = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      visualRows += Math.max(1, Math.ceil(line.length / cols));
    }
    return Math.max(1, visualRows);
  }

  // Return the slice of ring buffer entries to display given the current scrollOffset.
  // Budgets by visual rows (not logical entries) so wrapped lines fill the viewport correctly.
  _getVisibleLines() {
    const rows = this._getTerminalRows();
    const total = this._ringSize;
    const endIdx = Math.max(0, total - this.scrollOffset);
    // Walk backward from endIdx accumulating visual rows until the viewport is full.
    let visualRowsUsed = 0;
    let startIdx = endIdx;
    while (startIdx > 0 && visualRowsUsed < rows) {
      const entry = this._ringGet(startIdx - 1);
      visualRowsUsed += this._visualRowsForEntry(entry);
      startIdx--;
    }
    const lines = [];
    for (let i = startIdx; i < endIdx; i++) {
      lines.push(this._ringGet(i));
    }
    return lines;
  }

  // Compute the logical start/end indices of the currently visible window.
  // Returns { startIdx, endIdx } where entries in [startIdx, endIdx) are visible.
  _computeVisibleWindowIndices(scrollOffset = this.scrollOffset) {
    const rows = this._getTerminalRows();
    const total = this._ringSize;
    const endIdx = Math.max(0, total - scrollOffset);
    let visualRowsUsed = 0;
    let startIdx = endIdx;
    while (startIdx > 0 && visualRowsUsed < rows) {
      const entry = this._ringGet(startIdx - 1);
      visualRowsUsed += this._visualRowsForEntry(entry);
      startIdx--;
    }
    return { startIdx, endIdx };
  }

  // After a CLI-mode size change, attempt to preserve the previous top-most visible
  // logical entry by adjusting `scrollOffset` and re-rendering once.
  _applyCliModeViewportPreservation() {
    if (this._cliModePendingStartIdx == null) return;
    const rows = this._getTerminalRows();
    const total = this._ringSize;
    const endIdx = Math.min(total, this._cliModePendingStartIdx + rows);
    this.scrollOffset = Math.max(0, total - endIdx);
    // Clear pending marker and re-render live view
    this._cliModePendingStartIdx = undefined;
    this._renderView();
  }
  // Ring entries are either plain strings (normal lines) or {type:'header', text:'...'}.
  // When returning to scrollOffset === 0 and there is an active (uncommitted) line,
  // it is appended to the DOM and currentLineDiv is restored so subsequent write()
  // calls continue appending to it correctly.
  _renderView() {
    if (!this.outputDiv) return;
    this.outputDiv.innerHTML = '';
    this.currentLineDiv = null;
    const lines = this._getVisibleLines();
    for (let i = 0; i < lines.length; i++) {
      const entry = lines[i];
      if (entry && typeof entry === 'object' && entry.type === 'header') {
        const headerDiv = document.createElement('div');
        headerDiv.style.minHeight = '1.5em';
        const headerSpan = document.createElement('span');
        Object.assign(headerSpan.style, {
          backgroundColor: 'var(--slate-accent, #7289da)',
          color: '#ffffff',
          fontWeight: 'bold',
          padding: '0 4px',
          borderRadius: '2px',
        });
        headerSpan.innerHTML = this.parseRichText(entry.text ?? '');
        headerDiv.appendChild(headerSpan);
        this.outputDiv.appendChild(headerDiv);
      } else if (entry && typeof entry === 'object' && entry.type === 'loading') {
        const isActive = this._activeTasks.some(t => t.taskId === entry.taskId);
        this.outputDiv.appendChild(
          this._createLoadingDiv(
            entry.taskId,
            entry.timerStr,
            entry.spriteName,
            entry.message,
            isActive
          )
        );
      } else {
        const div = document.createElement('div');
        div.style.minHeight = '1.5em';
        const span = document.createElement('span');
        span.innerHTML = this.parseRichText(this._ringEntryText(entry));
        div.appendChild(span);
        this.outputDiv.appendChild(div);
      }
    }
    // When the live view is restored, recreate the active line in the DOM first (before
    // trimming) so its height is reserved and subsequent write() calls append correctly.
    if (this.scrollOffset === 0 && this._hasActiveLine()) {
      const div = document.createElement('div');
      div.style.minHeight = '1.5em';
      if (this.currentHistoryLine !== '') {
        const span = document.createElement('span');
        span.innerHTML = this.parseRichText(this.currentHistoryLine);
        div.appendChild(span);
      }
      this.outputDiv.appendChild(div);
      this.currentLineDiv = div;
    }
    // Remove oldest lines if wrapped content overflows the visible area.
    this._trimDOMByHeight();
  }

  // Returns true if the user currently has a non-collapsed text selection within outputDiv.
  // Used to pause DOM-destructive operations (trimming, span replacement) while the user
  // is selecting text, matching the behavior of standard terminal emulators.
  _isSelectionInOutputDiv() {
    if (!this.outputDiv) return false;
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);
      return this.outputDiv.contains(range.commonAncestorContainer);
    } catch (_) {
      return false;
    }
  }

  // Trim DOM nodes from the top of outputDiv until there is room for `newLines` more.
  _trimDOMToRows(newLines) {
    if (!this.outputDiv) return;
    if (this._isSelectionInOutputDiv()) {
      this._selectionPendingTrim = true;
      return;
    }
    const rows = this._getTerminalRows();
    while (this.outputDiv.childNodes.length + newLines > rows) {
      this.outputDiv.removeChild(this.outputDiv.firstChild);
    }
  }

  // Trim oldest DOM nodes from outputDiv until its rendered height fits within the
  // visible area of scrollArea. This corrects for logical lines that wrap to multiple
  // visual rows — the count-based _trimDOMToRows() cannot detect those.
  // Always preserves at least one child (the active/current line).
  _trimDOMByHeight() {
    if (!this.outputDiv || !this.scrollArea) return;
    if (this._isSelectionInOutputDiv()) {
      this._selectionPendingTrim = true;
      return;
    }
    const inputHeight = this.inputArea ? this.inputArea.offsetHeight || 0 : 0;
    const available = (this.scrollArea.clientHeight || 0) - inputHeight;
    if (available <= 0) return;
    const minChildren = this.currentLineDiv ? 1 : 0;
    while (
      this.outputDiv.childNodes.length > minChildren &&
      this.outputDiv.offsetHeight > available
    ) {
      this.outputDiv.removeChild(this.outputDiv.firstChild);
    }
  }

  // Legacy boundary: now delegates to _trimDOMToRows for DOM safety.
  enforceHistoryLimit() {
    this._trimDOMToRows(0);
  }

  // Legacy pre-capacity check: now delegates to _trimDOMToRows.
  _ensureSpaceFor(additionalLines) {
    this._trimDOMToRows(additionalLines);
  }

  // Lightweight listener registry so all listeners can be removed on destroy
  _addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._attachedListeners = this._attachedListeners || [];
    this._attachedListeners.push({ target, type, handler, options });
  }

  _removeAllListeners() {
    if (!this._attachedListeners) return;
    for (const { target, type, handler, options } of this._attachedListeners) {
      try {
        target.removeEventListener(type, handler, options);
      } catch (_e) {
        // ignore
      }
    }
    this._attachedListeners = [];
  }

  // Robust wrapper for Scratch VM execution polling
  _waitForThreads(threads, maxWaitMs = DEFAULT_MAX_WAIT_MS) {
    // STATUS_DONE mirrors Scratch VM's internal magic number for a finished thread.
    // NOTE: This relies on VM internals (STATUS_DONE = 4) and may break if the VM changes.
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let timerId = null;

      const clearTimer = () => {
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
      };

      const settle = callback => {
        clearTimer();
        callback();
      };

      const check = () => {
        const isDone = threads.every(thread => thread.status === STATUS_DONE);
        if (isDone) {
          settle(resolve);
          return;
        }

        if (Date.now() - start >= maxWaitMs) {
          settle(() =>
            reject(new Error(`Timed out waiting for VM threads after ${maxWaitMs}ms`))
          );
          return;
        }

        timerId = setTimeout(check, 33); // Check at ~30Hz
      };

      check();
    });
  }

  // --- DOM CREATION ---
  createDOM() {
    // Host element in document — minimal footprint, shadow DOM holds actual UI
    this._hostId = 'tw-slate-host-' + Math.floor(Math.random() * 1e9);
    this.host = document.createElement('div');
    this.host.id = this._hostId;
    this.host.style.all = 'initial';
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '500';
    this.host.dataset.slateInstance = this._hostId;
    document.body.appendChild(this.host);

    // Attach shadow root to fully encapsulate styles and DOM
    this.shadow = this.host.attachShadow({ mode: 'open' });

    this.container = document.createElement('div');
    this.container.className = 'tw-slate-container';
    this.container.style.setProperty('--slate-accent', this.currentConfig.accentColor);

    Object.assign(this.container.style, {
      position: 'fixed',
      top: '10%',
      left: '10%',
      width: this.currentConfig.width,
      height: this.currentConfig.height,
      backgroundColor: `rgba(18, 18, 20, ${this.currentConfig.opacity})`,
      color: '#e0e0e0',
      fontFamily: this.currentConfig.fontFamily,
      fontSize: this.currentConfig.fontSize,
      lineHeight: '1.5',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)',
      borderRadius: this.currentConfig.borderRadius,
      overflow: 'hidden',
      transition:
        'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s, top 0.3s, left 0.3s',
    });

    // Header
    this.header = document.createElement('div');
    Object.assign(this.header.style, {
      backgroundColor: '#1a1b1e',
      color: '#8b949e',
      padding: '10px 14px',
      fontSize: '13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      userSelect: 'none',
      cursor: 'grab',
      borderBottom: '2px solid var(--slate-accent)',
    });

    const controlsDiv = document.createElement('div');
    Object.assign(controlsDiv.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    });

    const createControlDot = (color, hoverColor, action) => {
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: color,
        cursor: 'pointer',
        transition: 'background-color 0.2s, transform 0.1s',
      });
      dot.addEventListener('mouseenter', () => {
        dot.style.backgroundColor = hoverColor;
        dot.style.transform = 'scale(1.15)';
      });
      dot.addEventListener('mouseleave', () => {
        dot.style.backgroundColor = color;
        dot.style.transform = 'scale(1)';
      });
      dot.addEventListener('click', action);
      return dot;
    };

    controlsDiv.appendChild(createControlDot('#ff5f56', '#ff7a73', () => this.hide()));
    controlsDiv.appendChild(
      createControlDot('#ffbd2e', '#ffcf5c', () => this.toggleMinimize())
    );
    controlsDiv.appendChild(
      createControlDot('#27c93f', '#4ddb63', () => this.toggleMaximize())
    );

    this.titleSpan = document.createElement('span');
    this.titleSpan.innerText = 'user@slate: ~';
    Object.assign(this.titleSpan.style, {
      fontWeight: '500',
      color: '#a1a8b5',
      letterSpacing: '0.5px',
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
    });

    const rightSpacer = document.createElement('div');
    rightSpacer.style.width = '52px';

    this.header.appendChild(controlsDiv);
    this.header.appendChild(this.titleSpan);
    this.header.appendChild(rightSpacer);
    this.container.appendChild(this.header);

    // Make draggable (this also registers document mouse listeners through our helper)
    this.makeDraggable(this.header, this.container);

    // Scroll area and output
    this.scrollArea = document.createElement('div');
    Object.assign(this.scrollArea.style, {
      padding: '0px 5px 5px 5px',
      flexGrow: '1',
      overflowY: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'text',
      transition: 'opacity 0.2s',
    });
    this.container.appendChild(this.scrollArea);

    this.outputDiv = document.createElement('div');
    this.outputDiv.style.whiteSpace = 'pre-wrap';
    this.outputDiv.style.wordBreak = 'break-all';
    this.outputDiv.setAttribute('aria-live', 'polite');
    this.scrollArea.appendChild(this.outputDiv);

    // Input area and controls
    this.inputArea = document.createElement('div');
    Object.assign(this.inputArea.style, {
      display: this.promptEnabled ? 'block' : 'none',
      marginTop: '0px',
      wordBreak: 'break-all',
      flexShrink: '0',
    });
    this.inputArea.setAttribute('aria-hidden', 'true'); // Screen readers use the real input

    this.promptSpan = document.createElement('span');
    this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);
    this.promptSpan.style.marginRight = '8px';
    this.promptSpan.style.color = '#00ffcc';
    this.promptSpan.style.fontWeight = 'bold';

    this.visibleInput = document.createElement('span');
    this.visibleInput.style.whiteSpace = 'pre-wrap';

    this.cursor = document.createElement('span');
    Object.assign(this.cursor.style, {
      display: 'inline-block',
      width: '0.6em',
      height: '1.2em',
      backgroundColor: '#e0e0e0',
      verticalAlign: 'middle',
      marginLeft: '2px',
      borderRadius: '1px',
    });

    // Scoped styles inside shadow root (no global injection)
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      @keyframes tw-term-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      @keyframes tw-term-pop { 0% { opacity: 0; transform: scale(0.97) translateY(5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      .tw-term-cursor-blink { animation: tw-term-blink 1s step-end infinite; }
      .tw-term-scroll::-webkit-scrollbar { width: 8px; }
      .tw-term-scroll::-webkit-scrollbar-track { background: transparent; }
      .tw-term-scroll::-webkit-scrollbar-thumb { background: var(--slate-accent, #7289da); border-radius: 4px; }
      .tw-term-scroll::-webkit-scrollbar-thumb:hover { filter: brightness(1.2); }
      .tw-slate-container ::selection { background: var(--slate-accent, #7289da); color: #ffffff; }
    `;
    this.shadow.appendChild(style);

    this.cursor.className = 'tw-term-cursor-blink';
    this.scrollArea.className = 'tw-term-scroll';

    this.inputArea.appendChild(this.promptSpan);
    this.inputArea.appendChild(this.visibleInput);
    this.inputArea.appendChild(this.cursor);
    this.scrollArea.appendChild(this.inputArea);

    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'text';
    this.hiddenInput.setAttribute('aria-label', 'Terminal input');
    this.hiddenInput.setAttribute('autocomplete', 'off');
    this.hiddenInput.setAttribute('spellcheck', 'false');
    Object.assign(this.hiddenInput.style, {
      position: 'absolute',
      opacity: '0.01',
      pointerEvents: 'none',
      width: '1px',
      height: '1px',
      left: '-9999px',
      top: '-9999px', // Accessible but hidden
    });

    // Use our listener registry so they can be removed by destroy()
    this._addListener(this.hiddenInput, 'input', () => {
      try {
        if ((!this.promptEnabled || this.isExecutingCommand) && !this.resolveInput) {
          // When the prompt is disabled we still want Backspace/Delete to remove
          // characters, but we should block adding new characters. If the new
          // hidden input value is shorter than what's currently visible, accept
          // the deletion. Otherwise, revert the hidden input to the visible text.
          const newVal = this.hiddenInput.value || '';
          const oldVal = this.visibleInput ? this.visibleInput.textContent || '' : '';
          if (newVal.length < oldVal.length) {
            // Deletion occurred — accept it.
            if (this.visibleInput) this.visibleInput.textContent = newVal;
          } else {
            // Block additions by restoring the previous visible text.
            this.hiddenInput.value = oldVal;
          }
          return;
        }
        if (this.visibleInput) {
          // In password mode show bullet characters instead of the actual input.
          this.visibleInput.textContent = this._passwordMode
            ? this._getMaskedValue(this.hiddenInput.value)
            : this.hiddenInput.value;
        }
      } catch (_e) {
        /* ignore */
      }
    });

    this._addListener(this.hiddenInput, 'keydown', e => {
      e.stopPropagation();

      try {
        if ((!this.promptEnabled || this.isExecutingCommand) && !this.resolveInput) {
          // Allow Backspace and Delete to work even when input is otherwise disabled
          if (e.key !== 'Backspace' && e.key !== 'Delete') {
            e.preventDefault();
            return;
          }
        }

        // TAB AUTOCOMPLETE
        if (e.key === 'Tab') {
          e.preventDefault();
          if (this.isExecutingCommand || this.resolveInput) return;

          const val = this.hiddenInput.value;
          const parts = val.split(/\s+/);

          if (parts.length === 1) {
            // Autocomplete Command
            const matches = Object.keys(this.commands).filter(c =>
              c.startsWith(parts[0])
            );
            if (matches.length === 1) {
              this.hiddenInput.value = matches[0] + ' ';
              this.visibleInput.textContent = this.hiddenInput.value;
            } else if (matches.length > 1) {
              this._printInternal(`\n@c #00ffcc:${matches.join('  ')}@c`);
              this._resetPromptIfReady();
            }
          } else if (parts.length === 2 && hasOwn(this.commands, parts[0])) {
            // Autocomplete Subcommand
            const cmd = parts[0];
            const sub = parts[1];
            const matches = Object.keys(this.commands[cmd].subcommands || {}).filter(s =>
              s.startsWith(sub)
            );
            if (matches.length === 1) {
              this.hiddenInput.value = `${cmd} ${matches[0]} `;
              this.visibleInput.textContent = this.hiddenInput.value;
            } else if (matches.length > 1) {
              this._printInternal(`\n@c #00ffcc:${matches.join('  ')}@c`);
              this._resetPromptIfReady();
            }
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          // Disable history recall in password mode to avoid leaking previous values.
          if (!this._passwordMode && this.historyIndex > 0) {
            this.historyIndex--;
            this.hiddenInput.value = this.inputHistory[this.historyIndex];
            this.visibleInput.textContent = this.hiddenInput.value;
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Disable history recall in password mode to avoid leaking previous values.
          if (!this._passwordMode) {
            if (this.historyIndex < this.inputHistory.length - 1) {
              this.historyIndex++;
              this.hiddenInput.value = this.inputHistory[this.historyIndex];
              this.visibleInput.textContent = this.hiddenInput.value;
            } else {
              this.historyIndex = this.inputHistory.length;
              this.hiddenInput.value = '';
              this.visibleInput.textContent = '';
            }
          }
          return;
        }

        if (e.key === 'Enter') {
          if (this.isExecutingCommand && !this.resolveInput) {
            e.preventDefault();
            return;
          }

          const val = this.hiddenInput.value;
          this.lastInput = val;

          // Do not add passwords to command history.
          if (val.trim() !== '' && !this._passwordMode) {
            this.inputHistory.push(val);
            // Enforce a maximum history size to avoid unbounded growth
            const max = this.maxHistoryLines || 300;
            while (this.inputHistory.length > max) this.inputHistory.shift();
            this.historyIndex = this.inputHistory.length;
          }

          let prefix = '';
          if (this.resolveInput) {
            prefix = this.stripRichText(this.queryPrompt) + (this.queryPrompt ? ' ' : '');
          } else if (this.promptEnabled) {
            prefix = this.stripRichText(this.defaultPrompt) + ' ';
          }

          // In password mode print bullet characters to the output rather than the real value.
          const displayVal = this._passwordMode ? this._getMaskedValue(val) : val;
          this._printInternal(prefix + displayVal);

          this.hiddenInput.value = '';
          this.visibleInput.textContent = '';

          if (this.resolveInput) {
            const resolve = this.resolveInput;
            this.resolveInput = null;
            this._resetPasswordMode();

            this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);

            if (this.promptEnabled && !this.isExecutingCommand) {
              this.inputArea.style.display = 'block';
              this.promptSpan.style.display = '';
            } else {
              this.inputArea.style.display = 'none';
            }
            resolve(val);
          } else {
            this.processInputQueue(val); // Redirect to the piping queue
          }
        }
      } catch (err) {
        console.error('Slate keydown handler error:', err);
        try {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
        } catch (_e) {
          /* empty */
        }
        // Normalize input state so the prompt remains usable
        try {
          if (this.resolveInput) {
            try {
              this.resolveInput('');
            } catch (_e) {
              /* empty */
            }
            this.resolveInput = null;
          }
          this._resetPasswordMode();
          if (this.hiddenInput) {
            this.hiddenInput.value = '';
          }
          if (this.visibleInput) {
            this.visibleInput.textContent = '';
          }
          if (this.promptSpan) {
            this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);
          }
          if (this.inputArea) {
            if (this.promptEnabled && !this.isExecutingCommand) {
              this.inputArea.style.display = 'block';
              if (this.promptSpan) this.promptSpan.style.display = '';
            } else {
              this.inputArea.style.display = 'none';
            }
          }
          if (typeof this._resetPromptIfReady === 'function') this._resetPromptIfReady();
        } catch (_e) {
          // ignore
        }
      }
    });

    // Append hidden input and the container into the shadow root so they are isolated
    this.container.appendChild(this.hiddenInput);
    this.shadow.appendChild(this.container);

    // Click/focus behavior on scroll area
    this._addListener(this.scrollArea, 'click', () => {
      if (this.container.style.display !== 'none') {
        // Don't steal focus (which clears the selection) if the user just finished selecting text.
        if (this._isSelectionInOutputDiv()) return;
        if (this.resolveInput || (this.promptEnabled && !this.isExecutingCommand)) {
          this.hiddenInput.focus();
        }
      }
    });

    let scrollAccumulator = 0;
    this._addListener(
      this.scrollArea,
      'wheel',
      e => {
        e.preventDefault();
        const fontSize = parseFloat(this.currentConfig.fontSize) || 15;
        const lineHeight = fontSize * 1.5;

        scrollAccumulator += e.deltaY;

        if (Math.abs(scrollAccumulator) >= lineHeight) {
          const linesToMove = Math.trunc(scrollAccumulator / lineHeight);
          scrollAccumulator -= linesToMove * lineHeight;

          if (this.isAltBuffer) {
            // In alternate buffer mode (e.g. vim/nano), report physical wheel direction
            // to the Scratch project instead of moving the scrollback view.
            // deltaY > 0 is wheel-down (scrolling content down = "up" arrow in the app).
            this._lastScrollDirection = linesToMove > 0 ? 'up' : 'down';
          } else {
            // Normal mode: shift scrollOffset and re-render if it changed.
            // deltaY > 0 = wheel-down → scroll toward bottom (decrease offset).
            const prevOffset = this.scrollOffset;
            this.scrollOffset = Math.max(
              0,
              Math.min(
                this.scrollOffset - linesToMove,
                Math.max(0, this._ringSize - this._getTerminalRows())
              )
            );
            if (this.scrollOffset !== prevOffset) {
              if (prevOffset === 0) {
                // Leaving live view: finalize any in-progress line first.
                this._finalizeCurrentLine();
              }
              this._renderView();
            }
          }
        }
      },
      { passive: false }
    );

    // Flush any pending DOM trim (deferred while a text selection was active) as soon as
    // the user clears their selection. This prevents unbounded DOM growth during selection.
    this._addListener(document, 'selectionchange', () => {
      if (this._selectionPendingTrim && !this._isSelectionInOutputDiv()) {
        this._selectionPendingTrim = false;
        this._trimDOMByHeight();
      }
    });
  }

  makeDraggable(dragHandle, windowContainer) {
    // Use instance-local drag state so handlers don't capture temporary variables
    this._dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      initialLeft: 0,
      initialTop: 0,
    };

    this._onDragMouseDown = e => {
      if (
        this.isMaximized ||
        this.isCliMode ||
        (e.target !== dragHandle && e.target !== this.titleSpan)
      )
        return;
      this._dragState.isDragging = true;
      this._dragState.startX = e.clientX;
      this._dragState.startY = e.clientY;

      windowContainer.style.transition = 'none';
      const rect = windowContainer.getBoundingClientRect();
      this._dragState.initialLeft = rect.left;
      this._dragState.initialTop = rect.top;
      dragHandle.style.cursor = 'grabbing';
    };

    this._onDragMouseMove = e => {
      if (!this._dragState || !this._dragState.isDragging) return;
      windowContainer.style.left = `${this._dragState.initialLeft + (e.clientX - this._dragState.startX)}px`;
      windowContainer.style.top = `${this._dragState.initialTop + (e.clientY - this._dragState.startY)}px`;
    };

    this._onDragMouseUp = () => {
      if (!this._dragState || !this._dragState.isDragging) return;
      this._dragState.isDragging = false;
      try {
        dragHandle.style.cursor = 'grab';
      } catch (_e) {
        /* empty */
      }
      windowContainer.style.transition =
        'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s, top 0.3s, left 0.3s';
    };

    // Register handlers via the listener registry so they can be removed later
    this._addListener(dragHandle, 'mousedown', this._onDragMouseDown);
    this._addListener(document, 'mousemove', this._onDragMouseMove);
    this._addListener(document, 'mouseup', this._onDragMouseUp);
  }

  toggleMinimize() {
    if (this.isMaximized || this.isCliMode) return;
    this.isMinimized = !this.isMinimized;

    // Clear any pending minimize/restore timer
    if (this.minimizeTimer) {
      clearTimeout(this.minimizeTimer);
      this.minimizeTimer = null;
    }

    if (this.isMinimized) {
      this.scrollArea.style.opacity = '0';
      this.minimizeTimer = setTimeout(() => {
        this.scrollArea.style.display = 'none';
        // Remove focus from hidden input to stop keyboard input
        if (this.hiddenInput) {
          this.hiddenInput.blur();
          this.hiddenInput.style.display = 'none';
        }
        this.minimizeTimer = null;
      }, 200);
      this.container.style.height = this.header.offsetHeight + 'px';
    } else {
      // Cancel any pending hide and begin restore
      this.scrollArea.style.display = 'flex';
      // Restore hidden input visibility and focus
      if (this.hiddenInput) {
        this.hiddenInput.style.display = '';
      }
      this.minimizeTimer = setTimeout(() => {
        this.scrollArea.style.opacity = '1';
        this.container.style.height = this.currentConfig.height;
        // Re-focus hidden input after restore
        if (this.hiddenInput) {
          this.hiddenInput.focus();
        }
        this.minimizeTimer = null;
      }, 10);
    }
  }

  toggleMaximize() {
    if (this.isMinimized || this.isCliMode) return;
    this.isMaximized = !this.isMaximized;

    if (this.isMaximized) {
      this.savedStyles = {
        top: this.container.style.top,
        left: this.container.style.left,
        width: this.container.style.width,
        height: this.container.style.height,
        borderRadius: this.container.style.borderRadius,
      };

      Object.assign(this.container.style, {
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        borderRadius: '0px',
      });
      this.header.style.cursor = 'default';
    } else {
      Object.assign(this.container.style, this.savedStyles);
      this.header.style.cursor = 'grab';
    }
  }

  _drawBox(title) {
    const width = 54;
    const available = width - 2;
    let displayTitle = String(title || '');
    if (displayTitle.length > available) {
      displayTitle = displayTitle.substring(0, available);
    }
    const padLeft = Math.floor((available - displayTitle.length) / 2);
    const padRight = Math.max(0, available - displayTitle.length - padLeft);
    this._printInternal(`@c #5c6370:╭${'─'.repeat(Math.max(0, width - 2))}╮@c`);
    this._printInternal(
      `@c #5c6370:│@c${' '.repeat(Math.max(0, padLeft))}@b:${displayTitle}@b${' '.repeat(Math.max(0, padRight))}@c #5c6370:│@c`
    );
    this._printInternal(`@c #5c6370:╰${'─'.repeat(Math.max(0, width - 2))}╯@c`);
  }

  showHelp(args) {
    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

    if (args.length === 0) {
      this._drawBox('SLATE HELP MANUAL');
      let maxLen = 0;
      for (const c in this.commands) maxLen = Math.max(maxLen, c.length);

      this._printInternal('@c #a1a8b5:AVAILABLE COMMANDS:@c');
      for (const c in this.commands) {
        const desc = this.commands[c].description || 'No description provided.';
        this._printInternal(`  @c #00ffcc:${pad(c, maxLen)}@c   @c #8b949e:${desc}@c`);
      }
      this._printInternal(
        '\n@c #5c6370:Type @c@c #00ffcc:help <command>@c@c #5c6370: for more details.@c'
      );
    } else {
      const c = args[0];
      const sub = args[1];

      if (!hasOwn(this.commands, c)) {
        this._printInternal(`@c #ff5f56:Command not found: ${c}@c`);
        const closest = this.getClosestCommand(c);
        if (closest)
          this._printInternal(
            `@c #8b949e:Did you mean '@c@c #00ffcc:${closest}@c@c #8b949e:'?@c`
          );
        return;
      }

      let target = this.commands[c];
      let isSub = false;
      let title = `COMMAND: ${c}`;

      if (sub && target.subcommands[sub]) {
        target = target.subcommands[sub];
        isSub = true;
        title = `COMMAND: ${c} ${sub}`;
      }

      this._drawBox(title);
      this._printInternal(
        `@c #e0e0e0:${target.description || 'No description provided.'}@c\n`
      );

      if (!isSub && Object.keys(target.subcommands).length > 0) {
        let maxSub = 0;
        for (const s in target.subcommands) maxSub = Math.max(maxSub, s.length);
        this._printInternal('@c #a1a8b5:SUBCOMMANDS:@c');
        for (const s in target.subcommands) {
          this._printInternal(
            `  @c #00ffcc:${pad(s, maxSub)}@c   @c #8b949e:${target.subcommands[s].description || 'No description provided.'}@c`
          );
        }
        this._printInternal('');
      }

      if (target.args.length > 0) {
        this._printInternal('@c #a1a8b5:ARGUMENTS:@c');
        const maxArg = target.args.reduce(
          (max, a) => Math.max(max, a.name.length + 2),
          0
        );
        target.args.forEach(a => {
          const reqTag = a.required ? '@c #ff5f56:[REQUIRED]@c ' : '           ';
          this._printInternal(
            `  @c #ffbd2e:${pad('<' + a.name + '>', maxArg)}@c   ${reqTag} @c #8b949e:${a.desc}@c`
          );
        });
        this._printInternal('');
      }

      if (target.flags.length > 0) {
        this._printInternal('@c #a1a8b5:FLAGS:@c');
        const maxFlag = target.flags.reduce(
          (max, f) => Math.max(max, f.name.length + 2),
          0
        );
        target.flags.forEach(f => {
          this._printInternal(
            `  @c #ffbd2e:${pad('--' + f.name, maxFlag)}@c               @c #8b949e:${f.desc}@c`
          );
        });
        this._printInternal('');
      }
    }
  }

  // --- COMMAND PIPELINE PROCESSING ---
  _tokenizePipeline(input) {
    const tokens = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = input[i + 1];

      // Handle escape sequences first so escaped quotes don't toggle state
      if (char === '\\' && nextChar) {
        // Append both the backslash and the escaped char to preserve literal sequence
        current += char + nextChar;
        i++;
        continue;
      }

      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
        current += char;
      } else if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = '';
        current += char;
      } else if (!inQuote && char === '&' && nextChar === '&') {
        if (current.trim()) tokens.push(current.trim());
        tokens.push('&&');
        current = '';
        i++; // Skip next '&'
      } else if (!inQuote && char === '|') {
        if (current.trim()) tokens.push(current.trim());
        tokens.push('|');
        current = '';
      } else if (!inQuote && /\s/.test(char) && !current.trim()) {
        // Skip leading whitespace
      } else {
        current += char;
      }
    }

    if (current.trim()) tokens.push(current.trim());
    return tokens;
  }

  // Quote-aware argument tokenizer: preserves quoted substrings and omits surrounding quotes
  _tokenizeArgs(input) {
    const tokens = [];
    if (!input) return tokens;
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let closedQuoteJustNow = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = input[i + 1];
      if (char === '\\' && nextChar) {
        // Only treat backslash as an escape for quotes or another backslash
        if (nextChar === '"' || nextChar === "'" || nextChar === '\\') {
          current += nextChar;
          i++;
          closedQuoteJustNow = false;
          continue;
        } else {
          // Preserve literal backslashes (e.g. Windows paths)
          current += '\\' + nextChar;
          i++;
          closedQuoteJustNow = false;
          continue;
        }
      }
      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
        closedQuoteJustNow = false;
        continue; // don't include surrounding quote
      }
      if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = '';
        closedQuoteJustNow = true;
        continue; // don't include surrounding quote
      }
      if (!inQuote && /\s/.test(char)) {
        if (current !== '' || closedQuoteJustNow) {
          tokens.push(current);
          current = '';
          closedQuoteJustNow = false;
        }
      } else {
        current += char;
        closedQuoteJustNow = false;
      }
    }
    if (current !== '' || closedQuoteJustNow) tokens.push(current);
    return tokens;
  }

  async processInputQueue(input) {
    this.isExecutingCommand = true;

    // Tokenize around '&&' and '|', preserving delimiters (quote-aware)
    const tokens = this._tokenizePipeline(input);
    let pipeValue = '';
    let lastSuccess = true;
    let requirePrevSuccess = false;

    try {
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === '&&') {
          // Next command should only run if previous succeeded; also clear any piped value
          requirePrevSuccess = true;
          pipeValue = '';
        } else if (token === '|') {
          // Pipe operator: pass pipeValue through to next command unchanged
        } else {
          // Token is a command
          if (requirePrevSuccess && !lastSuccess) {
            // Skip execution but clear the require flag and clear any piped value
            requirePrevSuccess = false;
            pipeValue = '';
            continue;
          }
          requirePrevSuccess = false;
          const result = await this.handleCommand(token, pipeValue);
          // Backwards compatibility: handleCommand may return a string
          if (typeof result === 'string') {
            lastSuccess = true;
            pipeValue = result;
          } else if (result && typeof result === 'object') {
            lastSuccess = !!result.success;
            pipeValue = result.output || '';
          } else {
            lastSuccess = false;
            pipeValue = '';
          }
        }
      }
    } catch (err) {
      this._printInternal(
        `@c #ff5f56:Pipeline Error: ${err.message || 'Unknown error'}@c`
      );
    } finally {
      this.isExecutingCommand = false;
      this._resetPromptIfReady();
    }
  }

  // Robust Command Execution with Error Boundaries & Piping Setup
  async handleCommand(input, pipedInput = '') {
    this.pipedInput = pipedInput;
    this.currentOutput = ''; // Reset execution output context for this step
    if (this._disposed) return { success: false, output: '' };

    const parts = this._tokenizeArgs((input || '').trim());
    const cmd = parts[0];

    if (!cmd) return { success: true, output: '' };

    if (cmd === 'help') {
      this.showHelp(parts.slice(1));
      return { success: true, output: '' };
    }

    // Built-in echo for piping testing
    if (cmd === 'echo') {
      const output = parts.length <= 1 ? pipedInput : parts.slice(1).join(' ');
      this._printInternal(output);
      return { success: true, output };
    }

    let sub = parts[1];
    const commandDef = this.commands[cmd];

    if (!commandDef) {
      this._printInternal(`@c #ff5f56:Command not found: ${cmd}@c`);
      const closest = this.getClosestCommand(cmd);
      if (closest)
        this._printInternal(
          `@c #8b949e:Did you mean '@c@c #00ffcc:${closest}@c@c #8b949e:'?@c`
        );
      return { success: false, output: '' };
    }

    try {
      let targetDef = commandDef;
      let isSubcommand = false;
      let argsOffset = 1;

      if (sub && commandDef.subcommands && hasOwn(commandDef.subcommands, sub)) {
        targetDef = commandDef.subcommands[sub];
        isSubcommand = true;
        argsOffset = 2;
      } else {
        sub = '';
      }

      const rawArgs = parts.slice(argsOffset);
      const positional = [];
      const flags = {};
      // Recognize flags: long flags start with "--" and can be multi-char; short flags are "-x" single letter only
      const isFlagToken = s =>
        /^--[A-Za-z][A-Za-z0-9-]*$/.test(s) || /^-[A-Za-z]$/.test(s);

      for (let i = 0; i < rawArgs.length; i++) {
        const a = rawArgs[i];
        if (isFlagToken(a)) {
          const flagName = a.replace(/^-+/, '');
          if (i + 1 < rawArgs.length && !isFlagToken(rawArgs[i + 1])) {
            flags[flagName] = rawArgs[i + 1];
            i++;
          } else {
            // Flags without an explicit value should be boolean true
            flags[flagName] = true;
          }
        } else {
          positional.push(a);
        }
      }

      this.currentParsedArgs = Object.create(null);
      this.currentParsedFlags = flags;

      const registeredArgs = targetDef.args || [];
      const missingArgs = [];

      for (let i = 0; i < registeredArgs.length; i++) {
        const argObj = registeredArgs[i];
        if (i < positional.length) {
          if (i === registeredArgs.length - 1) {
            this.currentParsedArgs[argObj.name] = positional.slice(i).join(' ');
          } else {
            this.currentParsedArgs[argObj.name] = positional[i];
          }
        } else {
          if (argObj.required) {
            missingArgs.push(argObj);
          } else {
            this.currentParsedArgs[argObj.name] = '';
          }
        }
      }

      if (missingArgs.length > 0) {
        for (const arg of missingArgs) {
          const ans = await this.queryUser({
            PROMPT: `Missing required arg <${arg.name}>:`,
          });
          if (this._disposed) return { success: false, output: '' };
          this.currentParsedArgs[arg.name] = ans;
        }
      }

      this.currentExecutingCommand = cmd;
      this.currentExecutingSubcommand = sub;

      let threads = [];
      if (Scratch && Scratch.vm) {
        if (isSubcommand) {
          threads = Scratch.vm.runtime.startHats('triflareSlate_whenSubcommand', {
            CMD: cmd,
            SUB: sub,
          });
        } else {
          threads = Scratch.vm.runtime.startHats('triflareSlate_whenCommand', {
            CMD: cmd,
          });
        }
      }

      if (threads && threads.length > 0) {
        this.inputArea.style.display = 'none';
        if (!this._disposed && this.hiddenInput) this.hiddenInput.blur();
        await this._waitForThreads(threads);
      }
    } catch (err) {
      this._printInternal(
        `@c #ff5f56:Execution Error: ${err.message || 'Unknown error occurred'}@c`
      );
      return { success: false, output: this.currentOutput };
    } finally {
      this.currentExecutingCommand = '';
      this.currentExecutingSubcommand = '';
    }

    // Hand back explicit command outputs for piping chaining
    return { success: true, output: this.currentOutput };
  }

  _resetPromptIfReady() {
    if (this._disposed) return;
    if (this.promptEnabled && !this.resolveInput) {
      this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);
      this.inputArea.style.display = 'block';
      // Only focus if scrollArea is visible (not hidden by minimize)
      if (this.hiddenInput && this.scrollArea) {
        const isVisible =
          this.scrollArea.style.display !== 'none' &&
          this.scrollArea.offsetParent !== null;
        if (isVisible) {
          this.hiddenInput.focus();
        }
      }
      if (this.autoScroll) this.scrollToBottom();
    }
  }

  parseRichText(text) {
    let safeText = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const sanitizeColor = c => {
      if (!c || /["';]/.test(c)) return 'inherit';
      const trimmed = c.trim();
      const safeHex = /^#[0-9a-fA-F]{3,8}$/;
      const safeVar = /^var\(--[\w-]+\)$/;
      const safeNamed = /^[a-zA-Z]+$/;
      const safeRgba =
        /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/;
      const safeHsla =
        /^hsla?\(\s*\d{1,3}(?:deg|)\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/;
      if (
        safeHex.test(trimmed) ||
        safeVar.test(trimmed) ||
        safeNamed.test(trimmed) ||
        safeRgba.test(trimmed) ||
        safeHsla.test(trimmed)
      ) {
        return trimmed;
      }
      return 'inherit';
    };
    safeText = safeText.replace(/@c\s*([^:]+):(.*?)@c/g, (m, c, t) => {
      const col =
        c.trim().toLowerCase() === 'accent' ? 'var(--slate-accent)' : sanitizeColor(c);
      return `<span style="color: ${col}">${t}</span>`;
    });
    safeText = safeText.replace(/@h\s*([^:]+):(.*?)@h/g, (m, c, t) => {
      const col =
        c.trim().toLowerCase() === 'accent' ? 'var(--slate-accent)' : sanitizeColor(c);
      return `<span style="background-color: ${col}; color: #111; padding: 0 2px; border-radius: 2px;">${t}</span>`;
    });
    safeText = safeText.replace(/@b:(.*?)@b/g, '<strong>$1</strong>');
    safeText = safeText.replace(/@i:(.*?)@i/g, '<em>$1</em>');
    safeText = safeText.replace(
      /@u:(.*?)@u/g,
      '<span style="text-decoration: underline;">$1</span>'
    );
    return safeText;
  }

  // --- EXTENSION INFO ---
  _getCommands() {
    const cmds = Object.keys(this.commands);
    // If no commands are registered, expose the reserved 'help' command so the
    // extension dropdown has at least one item (avoids errors in extension UI).
    // The help command is implemented elsewhere and is safe to expose here.
    return cmds.length > 0 ? cmds : ['help'];
  }

  _getSubcommands() {
    const subs = new Set();
    for (const key in this.commands) {
      if (!hasOwn(this.commands, key)) continue;
      Object.keys(this.commands[key].subcommands || {}).forEach(sub => subs.add(sub));
    }
    const subArray = Array.from(subs);
    return subArray.length > 0 ? subArray : ['info'];
  }

  // --- ACTIONS & PROPERTIES ---
  doAction(args) {
    const action = String(args.ACTION).toLowerCase();
    switch (action) {
      case 'show':
        this.show();
        break;
      case 'hide':
        this.hide();
        break;
      case 'clear':
        this.clear();
        break;
      case 'maximize':
        if (!this.isMaximized) this.toggleMaximize();
        break;
      case 'minimize':
        if (!this.isMinimized) this.toggleMinimize();
        break;
      case 'restore':
        if (this.isMaximized) this.toggleMaximize();
        if (this.isMinimized) this.toggleMinimize();
        break;
    }
  }

  show() {
    this.container.style.display = 'flex';
    this.container.style.animation =
      'tw-term-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    if (this.promptEnabled || this.resolveInput) this.hiddenInput.focus();
  }

  hide() {
    // If a prompt is pending, resolve it to avoid leaving awaiting promises unresolved
    try {
      if (typeof this.resolveInput === 'function') {
        try {
          this.resolveInput('');
        } catch (err) {
          console.warn('Error resolving pending input during hide:', err);
        }
        this.resolveInput = null;
      }
    } catch (err) {
      console.warn('Error while settling resolveInput in hide:', err);
    }

    // Reset in-memory and DOM prompt state so canceled prompts don't reappear
    try {
      this.queryPrompt = '';
      this._resetPasswordMode();
      if (this.hiddenInput) this.hiddenInput.value = '';
      if (this.visibleInput) this.visibleInput.textContent = '';
      if (this.promptSpan)
        this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);
      if (this.inputArea) {
        if (this.promptEnabled && !this.isExecutingCommand) {
          this.inputArea.style.display = 'block';
          if (this.promptSpan) this.promptSpan.style.display = '';
        } else {
          this.inputArea.style.display = 'none';
        }
      }
    } catch (_e) {
      // ignore
    }

    this.container.style.display = 'none';
    this.container.style.animation = '';
  }

  clear() {
    if (this.outputDiv) this.outputDiv.innerHTML = '';
    this._ringHead = 0;
    this._ringSize = 0;
    this.currentHistoryLine = '';
    this.currentLineDiv = null;
    this.scrollOffset = 0;
    // Reset loading state and clear pinned tasks
    this.isLoading = false;
    this._activeTasks = [];
    this._loadingFrameIndex = 0;
    this._stopLoadingAnimation();
  }

  getTerminalInfo(args) {
    const info = String(args.INFO).toLowerCase();
    switch (info) {
      case 'answer':
        return this.lastInput;
      case 'piped input':
        return this.pipedInput || '';
      case 'output history': {
        // Build history from ring buffer (completed lines) + any active line.
        const lines = [];
        for (let i = 0; i < this._ringSize; i++) {
          lines.push(this._ringEntryText(this._ringGet(i)));
        }
        if (this._hasActiveLine()) {
          lines.push(this.currentHistoryLine);
        }
        return lines.join('\n');
      }
      case 'scroll offset':
        return this.scrollOffset;
      case 'scroll direction': {
        // Consume and return the last scroll direction set in alt buffer mode.
        const dir = this._lastScrollDirection;
        this._lastScrollDirection = '';
        return dir;
      }
      case 'is alt buffer?':
        return this.isAltBuffer;
      case 'current command':
        return this.currentExecutingCommand;
      case 'current subcommand':
        return this.currentExecutingSubcommand;
      case 'is visible?':
        return this.container.style.display !== 'none';
      case 'is maximized?':
        return this.isMaximized;
      case 'is minimized?':
        return this.isMinimized;
      case 'is cli mode?':
        return this.isCliMode;
      default:
        return '';
    }
  }

  setTerminalProperty(args) {
    const prop = String(args.PROP).toLowerCase();
    const val = String(args.VALUE);
    switch (prop) {
      case 'title':
        this.titleSpan.innerText = val;
        break;
      case 'prompt text':
        this.defaultPrompt = val;
        if (!this.resolveInput && this.promptEnabled && !this.isExecutingCommand) {
          this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);
        }
        break;
      case 'prompt visibility':
        this.promptEnabled =
          val.toLowerCase() === 'enable' || val.toLowerCase() === 'true';
        if (this.promptEnabled) {
          if (!this.resolveInput && !this.isExecutingCommand) {
            this.inputArea.style.display = 'block';
            this.promptSpan.innerHTML = this.parseRichText(this.defaultPrompt);
            this.promptSpan.style.display = '';
            this.hiddenInput.focus();
          }
        } else if (!this.resolveInput) {
          this.inputArea.style.display = 'none';
          if (!this._disposed && this.hiddenInput) this.hiddenInput.blur();
        }
        break;
      case 'cli mode':
        this._setCliModeInternal(
          val.toLowerCase() === 'enable' || val.toLowerCase() === 'true'
        );
        break;
      case 'width':
        this.currentConfig.width = val + (isNaN(val) ? '' : 'px');
        if (!this.isMaximized && !this.isCliMode)
          this.container.style.width = this.currentConfig.width;
        break;
      case 'height':
        this.currentConfig.height = val + (isNaN(val) ? '' : 'px');
        if (!this.isMaximized && !this.isMinimized && !this.isCliMode)
          this.container.style.height = this.currentConfig.height;
        break;
      case 'top':
        if (!this.isMaximized && !this.isCliMode)
          this.container.style.top = val + (isNaN(val) ? '' : 'px');
        break;
      case 'left':
        if (!this.isMaximized && !this.isCliMode)
          this.container.style.left = val + (isNaN(val) ? '' : 'px');
        break;
      case 'font size':
        this.currentConfig.fontSize = val + (isNaN(val) ? '' : 'px');
        this.container.style.fontSize = this.currentConfig.fontSize;
        break;
      case 'font family':
        this.currentConfig.fontFamily = val;
        this.container.style.fontFamily = val;
        break;
      case 'opacity':
        this.currentConfig.opacity = val;
        // Compose opacity with the configured background color when possible
        try {
          const bg = this.currentConfig.background || '';
          const applyOpacity = bgColor => {
            if (typeof bgColor !== 'string' || bgColor === '') return;
            if (bgColor.startsWith('rgb')) {
              const nums = bgColor.match(/\d+/g);
              if (nums && nums.length >= 3) {
                this.container.style.backgroundColor = `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${val})`;
                return;
              }
            } else {
              try {
                // Create a single hidden probe element and reuse it to avoid layout reflows
                if (!this._colorProbeElement) {
                  const probe = document.createElement('div');
                  probe.style.position = 'absolute';
                  probe.style.width = '0';
                  probe.style.height = '0';
                  probe.style.overflow = 'hidden';
                  probe.style.visibility = 'hidden';
                  probe.style.pointerEvents = 'none';
                  document.body.appendChild(probe);
                  this._colorProbeElement = probe;
                }
                this._colorProbeElement.style.color = bgColor;
                const computed = getComputedStyle(this._colorProbeElement).color;
                const nums = (computed || '').match(/\d+/g);
                if (nums && nums.length >= 3) {
                  this.container.style.backgroundColor = `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${val})`;
                  return;
                }
              } catch (_e) {
                // ignore and fall back
              }
            }
            // Fallback
            this.container.style.backgroundColor = `rgba(18, 18, 20, ${val})`;
          };
          applyOpacity(bg);
        } catch (_e) {
          this.container.style.backgroundColor = `rgba(18, 18, 20, ${val})`;
        }
        break;
      case 'border radius':
        this.currentConfig.borderRadius = val + (isNaN(val) ? '' : 'px');
        if (!this.isMaximized && !this.isCliMode)
          this.container.style.borderRadius = this.currentConfig.borderRadius;
        break;
      case 'auto-scroll':
        this.autoScroll = val.toLowerCase() === 'enable' || val.toLowerCase() === 'true';
        break;
      case 'debug logging':
        SlateConfig.debugEnabled =
          val.toLowerCase() === 'enable' || val.toLowerCase() === 'true';
        break;
      case 'alt-buffer':
        this.isAltBuffer = val.toLowerCase() === 'enable' || val.toLowerCase() === 'true';
        if (!this.isAltBuffer) this._lastScrollDirection = '';
        break;
    }
  }

  setColors(args) {
    this.currentConfig.background = args.BG;
    this.currentConfig.foreground = args.FG;
    const opacity = this.currentConfig.opacity || '1';
    try {
      const bg = args.BG;
      if (typeof bg === 'string' && bg.startsWith('rgb')) {
        const nums = bg.match(/\d+/g);
        if (nums && nums.length >= 3) {
          this.container.style.backgroundColor = `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${opacity})`;
        } else {
          this.container.style.backgroundColor = bg;
        }
      } else if (typeof bg === 'string') {
        try {
          if (!this._colorProbeElement) {
            const probe = document.createElement('div');
            probe.style.position = 'absolute';
            probe.style.width = '0';
            probe.style.height = '0';
            probe.style.overflow = 'hidden';
            probe.style.visibility = 'hidden';
            probe.style.pointerEvents = 'none';
            document.body.appendChild(probe);
            this._colorProbeElement = probe;
          }
          this._colorProbeElement.style.color = bg;
          const computed = getComputedStyle(this._colorProbeElement).color;
          const nums = (computed || '').match(/\d+/g);
          if (nums && nums.length >= 3) {
            this.container.style.backgroundColor = `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${opacity})`;
          } else {
            this.container.style.backgroundColor = bg;
          }
        } catch (_e) {
          this.container.style.backgroundColor = bg;
        }
      } else {
        this.container.style.backgroundColor = args.BG;
      }
    } catch (_e) {
      this.container.style.backgroundColor = args.BG;
    }
    this.container.style.color = args.FG;
    this.cursor.style.backgroundColor = args.FG;
    this.currentConfig.accentColor = args.ACC;
    this.container.style.setProperty('--slate-accent', args.ACC);
  }

  _setCliModeInternal(enable) {
    // Preserve current visible window so toggling CLI mode can restore view
    try {
      const prev = this._computeVisibleWindowIndices();
      this._cliModePendingStartIdx = prev.startIdx;
      this._cliModeInitialRefreshDone = false;
    } catch (_e) {
      this._cliModePendingStartIdx = undefined;
      this._cliModeInitialRefreshDone = false;
    }

    if (enable && !this.isCliMode) {
      if (this.isMaximized) this.toggleMaximize();
      if (this.isMinimized) this.toggleMinimize();
      this.isCliMode = true;
      this.savedStyles = {
        top: this.container.style.top,
        left: this.container.style.left,
        width: this.container.style.width,
        height: this.container.style.height,
        borderRadius: this.container.style.borderRadius,
      };
      this.header.style.display = 'none';
      this.container.style.transition = 'none';
      const updatePos = () => {
        if (!this.isCliMode) return;
        const cvs = this.canvas;
        if (cvs) {
          const rect = cvs.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(cvs);
          Object.assign(this.container.style, {
            top: rect.top + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            borderRadius: computedStyle.borderRadius || '0px',
          });
          // After the first size adjustment, preserve the visible window.
          if (this._cliModePendingStartIdx != null && !this._cliModeInitialRefreshDone) {
            this._cliModeInitialRefreshDone = true;
            this._applyCliModeViewportPreservation();
          }
        }
        // Cancel any previously scheduled frame before queuing another to avoid duplicates
        try {
          if (this._cliModeRaf) cancelAnimationFrame(this._cliModeRaf);
        } catch (e) {
          void e;
        }
        this._cliModeRaf = requestAnimationFrame(updatePos);
      };
      // Ensure no stale frame is pending before starting the loop
      try {
        if (this._cliModeRaf) cancelAnimationFrame(this._cliModeRaf);
      } catch (e) {
        void e;
      }
      // Run once synchronously so the container size adjusts immediately,
      // then updatePos will schedule further frames.
      updatePos();
    } else if (!enable && this.isCliMode) {
      this.isCliMode = false;
      this.header.style.display = 'flex';
      this.container.style.transition =
        'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s, top 0.3s, left 0.3s';
      Object.assign(this.container.style, this.savedStyles);
      // Cancel any cli-mode RAF loop
      try {
        if (this._cliModeRaf) {
          cancelAnimationFrame(this._cliModeRaf);
          this._cliModeRaf = null;
        }
      } catch (_e) {
        /* empty */
      }
      // Restore the viewport to where the user was prior to toggling CLI mode.
      try {
        this._applyCliModeViewportPreservation();
      } catch (_e) {
        /* ignore */
      }
    }
  }

  // --- PRINTING & FORMATTING ---
  write(args) {
    if (this._disposed) return;
    const str = String(args.TEXT);

    // When scrolled back, accumulate text in memory only — DOM shows the frozen history view.
    // Still trigger autoscroll so a burst of new lines returns to the live view.
    if (this.scrollOffset > 0) {
      this.currentHistoryLine += str;
      if (this.autoScroll) this.scrollToBottom();
      return;
    }

    // Live view: maintain incremental DOM
    if (!this.currentLineDiv) {
      this._trimDOMToRows(1);
      this.currentLineDiv = document.createElement('div');
      this.currentLineDiv.style.minHeight = '1.5em';
      this.outputDiv.appendChild(this.currentLineDiv);
    }
    if (str !== '') {
      const span = document.createElement('span');
      span.innerHTML = this.parseRichText(str);
      this.currentLineDiv.appendChild(span);
    }
    this.currentHistoryLine += str;
    // After adding content, trim oldest lines so wrapped text doesn't overflow the view.
    this._trimDOMByHeight();
    if (this.autoScroll) this.scrollToBottom();
  }

  print(args) {
    this._printInternal(args.TEXT);
  }

  _finalizeCurrentLine() {
    if (this._hasActiveLine()) {
      this._ringPush(this.currentHistoryLine);
      this.currentHistoryLine = '';
      this.currentLineDiv = null;
    }
  }

  _printInternal(text) {
    if (this._disposed) return;
    // Finalize any existing active line so print always starts on a fresh line
    this._finalizeCurrentLine();
    this.write({ TEXT: text });
    // Keep currentLineDiv active so that subsequent write() calls can append to this line
  }

  printHeader(args) {
    const text = String(args.TEXT);
    this._finalizeCurrentLine();
    // Push a typed object so _renderView can distinguish a header from a plain line
    // that happens to contain text matching the old sentinel pattern.
    this._ringPush({ type: 'header', text });

    // Only update the live DOM when the user is at the bottom of the buffer.
    if (this.scrollOffset === 0) {
      this._trimDOMToRows(1);
      const headerDiv = document.createElement('div');
      headerDiv.style.minHeight = '1.5em';
      const headerSpan = document.createElement('span');
      Object.assign(headerSpan.style, {
        backgroundColor: 'var(--slate-accent, #7289da)',
        color: '#ffffff',
        fontWeight: 'bold',
        padding: '0 4px',
        borderRadius: '2px',
      });
      headerSpan.innerHTML = this.parseRichText(text);
      headerDiv.appendChild(headerSpan);
      this.outputDiv.appendChild(headerDiv);
      this._trimDOMByHeight();
    }
    // Always trigger autoscroll so scrollback mode returns to the live view on new output.
    if (this.autoScroll) this.scrollToBottom();
  }

  formatText(args) {
    const text = String(args.TEXT);
    const color = String(args.COLOR);
    const style = String(args.STYLE).toLowerCase();
    let res = text;
    switch (style) {
      case 'bold':
        res = `@b:${res}@b`;
        break;
      case 'italic':
        res = `@i:${res}@i`;
        break;
      case 'underline':
        res = `@u:${res}@u`;
        break;
      case 'highlight':
        return `@h ${color}:${res}@h`;
    }
    return `@c ${color}:${res}@c`;
  }

  // --- LOGGING SYSTEM ---

  // Get the current project timer value in seconds.
  // Falls back to wall-clock time when the Scratch runtime is unavailable (e.g. tests).
  _getProjectTimer() {
    try {
      return Scratch.vm.runtime.ioDevices.clock.projectTimer();
    } catch (_) {
      return Date.now() / 1000;
    }
  }

  // Format a timer value into a fixed-width bracket string, e.g. "[0.016000]" or "[10.01600]".
  // The function aims to keep the bracket content at up to 8 characters by reducing decimal places
  // (decimals = Math.max(0, 7 - intDigits)), but for very large values where the integer part
  // exceeds 7 digits (e.g., >= 10,000,000), decimals are clamped to 0 and the content may exceed
  // 8 characters. Example: 12345678 becomes "[12345678]" (8 digits, no decimals).
  _formatTimerStr(seconds) {
    const s = Math.max(0, seconds);
    const intDigits = String(Math.floor(s)).length;
    const decimals = Math.max(0, 7 - intDigits);
    return `[${s.toFixed(decimals)}]`;
  }

  // Format a sprite name into exactly 10 characters.
  // Names longer than 7 characters are truncated to 7 and get '...' appended.
  // Shorter names are right-padded with spaces.
  _formatSpriteName(sprite) {
    let name = String(sprite ?? '');
    if (name.length > 7) name = name.slice(0, 7) + '...';
    return name.padEnd(10);
  }

  _getCurrentSpriteName() {
    try {
      if (!Scratch || !Scratch.vm || !Scratch.vm.runtime) return 'Sprite1';
      const vm = Scratch.vm;
      const runtime = vm.runtime || vm;

      let currentName = null;
      if (typeof runtime.getEditingTarget === 'function') {
        const t = runtime.getEditingTarget();
        if (t)
          currentName = t.name || (typeof t.getName === 'function' ? t.getName() : null);
      }

      if (!currentName && vm.editingTarget) {
        const id = vm.editingTarget;
        if (typeof runtime.getTargetById === 'function') {
          const t = runtime.getTargetById(id);
          if (t)
            currentName =
              t.name || (typeof t.getName === 'function' ? t.getName() : null);
        } else if (runtime.targets && Array.isArray(runtime.targets)) {
          const t = runtime.targets.find(tt => tt.id === id);
          if (t) currentName = t.name;
        }
      }

      if (!currentName && runtime.targets && runtime.targets.length > 0) {
        const t = runtime.targets.find(tt => !tt.isStage) || runtime.targets[0];
        currentName =
          t && (t.name || (typeof t.getName === 'function' ? t.getName() : null));
      }

      if (!currentName) currentName = 'Sprite1';
      return currentName;
    } catch (_e) {
      return 'Sprite1';
    }
  }

  // Create a loading line div element. When isActive is true the initial animation frame is used
  // and data-loading-task-id is set so the interval can update it in-place.
  _createLoadingDiv(taskId, timerStr, spriteName, message, isActive) {
    const div = document.createElement('div');
    div.style.minHeight = '1.5em';
    if (isActive) div.dataset.loadingTaskId = String(taskId);
    const span = document.createElement('span');
    const frame = isActive
      ? LOADING_FRAMES[this._loadingFrameIndex % LOADING_FRAMES.length]
      : LOADING_DONE_FRAME;
    const logDef = LOG_TYPES.loading;
    const line = `${timerStr} @c ${logDef.color}:${frame}@c @c ${logDef.spriteColor}:${spriteName}@c: ${message}`;
    span.innerHTML = this.parseRichText(line);
    div.appendChild(span);
    return div;
  }

  // Update the DOM spans for active loading tasks with the current animation frame.
  // Called by the animation interval every 100 ms.
  _updateLoadingLinesInDOM() {
    if (!this.outputDiv || typeof this.outputDiv.querySelector !== 'function') return;
    if (this._activeTasks.length === 0) return;
    if (this._isSelectionInOutputDiv()) return;
    if (this.scrollOffset > 0) return;
    const frame = LOADING_FRAMES[this._loadingFrameIndex % LOADING_FRAMES.length];
    const logDef = LOG_TYPES.loading;
    for (const task of this._activeTasks) {
      const div = this.outputDiv.querySelector(`[data-loading-task-id="${task.taskId}"]`);
      if (div) {
        const span = div.firstChild;
        if (span) {
          const line = `${task.timerStr} @c ${logDef.color}:${frame}@c @c ${logDef.spriteColor}:${task.spriteName}@c: ${task.message}`;
          span.innerHTML = this.parseRichText(line);
        }
      }
    }
  }

  // Replace the spinner on the innermost active loading task DOM element with LOADING_DONE_FRAME
  // and remove its data-loading-task-id so the interval no longer targets it.
  // Called just before the task is popped from _activeTasks on success/error.
  _resolveLoadingLinesInDOM() {
    if (!this.outputDiv || typeof this.outputDiv.querySelector !== 'function') return;
    if (this._activeTasks.length === 0) return;
    const logDef = LOG_TYPES.loading;
    const task = this._activeTasks[this._activeTasks.length - 1];
    const div = this.outputDiv.querySelector(`[data-loading-task-id="${task.taskId}"]`);
    if (div) {
      div.removeAttribute('data-loading-task-id');
      const span = div.firstChild;
      if (span) {
        const line = `${task.timerStr} @c ${logDef.color}:${LOADING_DONE_FRAME}@c @c ${logDef.spriteColor}:${task.spriteName}@c: ${task.message}`;
        span.innerHTML = this.parseRichText(line);
      }
    }
  }

  // Start the 100 ms animation interval for loading tasks (no-op if already running).
  _startLoadingAnimation() {
    if (this._loadingInterval !== null) return;
    this._loadingInterval = setInterval(() => {
      this._loadingFrameIndex = (this._loadingFrameIndex + 1) % LOADING_FRAMES.length;
      this._updateLoadingLinesInDOM();
    }, 100);
  }

  // Stop the animation interval (no-op if not running).
  _stopLoadingAnimation() {
    if (this._loadingInterval === null) return;
    clearInterval(this._loadingInterval);
    this._loadingInterval = null;
  }

  // Core logging implementation.
  // Formats and prints a structured log line and manages isLoading state.
  // A "loading" log prints as an animated ordinary line; the animation is updated
  // in-place until success/error resolves it.
  _slateLog(type, sprite, message) {
    if (type === 'debug' && !SlateConfig.debugEnabled) return;

    const timerStr = this._formatTimerStr(this._getProjectTimer());
    const spriteName = this._formatSpriteName(sprite);

    // Prepend spaces scaled to nesting depth while a loading task is active.
    let msg = String(message ?? '');
    if (this.isLoading) {
      msg = '  '.repeat(this._activeTasks.length) + msg;
    }

    if (type === 'loading') {
      this.isLoading = true;
      this._nextLoadingTaskId += 1;
      const taskId = this._nextLoadingTaskId;
      this._activeTasks.push({ taskId, timerStr, spriteName, message: msg });
      this._startLoadingAnimation();
      // Commit any previous active line, then push the loading entry as a typed ring buffer
      // object so its DOM element can be found and animated by the interval.
      this._finalizeCurrentLine();
      this._ringPush({ type: 'loading', taskId, timerStr, spriteName, message: msg });
      // Render the loading line in the live DOM, tagged for in-place animation updates.
      if (!this._disposed && this.outputDiv && this.scrollOffset === 0) {
        this._trimDOMToRows(1);
        this.outputDiv.appendChild(
          this._createLoadingDiv(taskId, timerStr, spriteName, msg, true)
        );
        this._trimDOMByHeight();
      }
      if (this.autoScroll) this.scrollToBottom();
      return;
    }

    if (type === 'success' || type === 'error') {
      this._resolveLoadingLinesInDOM();
      this._activeTasks.pop();
      if (this._activeTasks.length === 0) {
        this._stopLoadingAnimation();
        this.isLoading = false;
      }
    }

    const logDef = LOG_TYPES[type] ?? {
      tag: '( ? )',
      color: '#e0e0e0',
      spriteColor: '#a0a0a0',
    };
    const line = `${timerStr} @c ${logDef.color}:${logDef.tag}@c @c ${logDef.spriteColor}:${spriteName}@c: ${msg}`;
    this._printInternal(line);
  }

  // Scratch block handler for slateLog.
  slateLog(args, util) {
    const type = String(args.TYPE ?? 'info').toLowerCase();
    const message = String(args.MESSAGE ?? '');
    const sprite =
      (util &&
        util.target &&
        (util.target.name ||
          (typeof util.target.getName === 'function' && util.target.getName()))) ||
      this._getCurrentSpriteName();
    this._slateLog(type, sprite, message);
  }

  queryUser(args) {
    if (this._disposed) return Promise.resolve('');
    if (this.resolveInput) this.resolveInput('');
    return new Promise(resolve => {
      if (this._disposed) {
        resolve('');
        return;
      }
      this.queryPrompt = String(args.PROMPT);
      this._passwordMode = String(args.TYPE || 'text').toLowerCase() === 'password';

      // Ensure terminal/container is visible first so focusing won't hang
      try {
        if (
          this.container &&
          this.container.style &&
          this.container.style.display === 'none'
        ) {
          this.container.style.display = 'flex';
          this.container.style.animation =
            'tw-term-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        }
      } catch (_e) {
        // ignore
      }

      if (this.promptSpan)
        this.promptSpan.innerHTML = this.parseRichText(this.queryPrompt);
      if (this.inputArea) this.inputArea.style.display = 'block';
      if (this.promptSpan) this.promptSpan.style.display = this.queryPrompt ? '' : 'none';

      // In password mode replace the solid-block cursor with a blinking * ASCII indicator.
      if (this.cursor) {
        if (this._passwordMode) {
          this.cursor.textContent = '*';
          Object.assign(this.cursor.style, {
            backgroundColor: 'transparent',
            color: '#e0e0e0',
            width: 'auto',
            height: 'auto',
            fontWeight: 'bold',
          });
        } else {
          this._resetPasswordMode();
        }
      }

      if (this.hiddenInput) this.hiddenInput.value = '';
      if (this.visibleInput) this.visibleInput.textContent = '';

      // Assign resolver before focusing to ensure the promise is settled correctly
      this.resolveInput = resolve;
      try {
        if (this.hiddenInput) this.hiddenInput.focus();
      } catch (_e) {
        // ignore focus errors
      }
      if (this.autoScroll) this.scrollToBottom();
    });
  }

  setCommandOutput(args) {
    this.currentOutput = String(args.TEXT);
  }

  // Clean up DOM, listeners, timers and observers. Call when extension unloads/reloads.
  destroy() {
    // Mark disposed immediately to prevent resumed tasks from touching DOM
    this._disposed = true;
    // Resolve any pending prompt promise to avoid hanging awaiters
    try {
      if (typeof this.resolveInput === 'function') {
        try {
          this.resolveInput('');
        } catch (err) {
          console.warn('Error resolving pending input during destroy:', err);
        }
        this.resolveInput = null;
      }
    } catch (err) {
      console.warn('Error while settling resolveInput in destroy:', err);
    }

    // Clear timers
    try {
      if (this.minimizeTimer) {
        clearTimeout(this.minimizeTimer);
        this.minimizeTimer = null;
      }
    } catch (_e) {
      /* empty */
    }

    // Remove event listeners
    try {
      this._removeAllListeners();
    } catch (_e) {
      /* empty */
    }

    // Remove host (which contains the shadow root)
    try {
      if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
    } catch (_e) {
      /* empty */
    }

    // Stop CLI mode animation loops
    this.isCliMode = false;
    try {
      if (this._cliModeRaf) {
        cancelAnimationFrame(this._cliModeRaf);
        this._cliModeRaf = null;
      }
    } catch (e) {
      void e;
    }

    // Stop loading animation interval
    try {
      this._stopLoadingAnimation();
    } catch (_e) {
      /* empty */
    }
    this.isLoading = false;
    this._loadingFrameIndex = 0;
    this._activeTasks = [];

    // Remove color probe element if present
    try {
      if (this._colorProbeElement && this._colorProbeElement.parentNode) {
        this._colorProbeElement.parentNode.removeChild(this._colorProbeElement);
      }
    } catch (_e) {
      /* empty */
    }
    this._colorProbeElement = null;

    // Null-out large references to help GC
    this.container = null;
    this.shadow = null;
    this.host = null;
    this.outputDiv = null;
    this.hiddenInput = null;
    this.scrollArea = null;
    this._ringBuf = null;
    this._ringSize = 0;
    this._ringHead = 0;
  }

  scrollToBottom() {
    try {
      if (this.scrollOffset !== 0) {
        // Don't destroy an active user selection — let the user finish selecting.
        if (this._isSelectionInOutputDiv()) return;
        this.scrollOffset = 0;
        this._renderView();
      }
    } catch (err) {
      console.warn('scrollToBottom error during teardown:', err);
    }
  }

  // --- COMMAND REGISTRATION ---
  registerCommand(args) {
    const cmd = String(args.CMD).trim();
    const desc = String(args.DESC).trim();
    if (!cmd) {
      console.error(
        `registerCommand: CMD is required and cannot be empty (received: ${String(args.CMD)})`
      );
      return;
    }
    if (!this._isValidCmdOrSubToken(cmd)) {
      console.error(`registerCommand: invalid or reserved command name '${cmd}'`);
      return;
    }
    if (!hasOwn(this.commands, cmd))
      this.commands[cmd] = {
        description: desc,
        subcommands: Object.create(null),
        args: [],
        flags: [],
      };
    else this.commands[cmd].description = desc;
  }
  registerSubcommand(args) {
    const cmd = String(args.CMD).trim();
    const sub = String(args.SUB).trim();
    const desc = String(args.DESC).trim();
    if (!cmd) {
      console.error(
        `registerSubcommand: CMD is required and cannot be empty (received: ${String(args.CMD)})`
      );
      return;
    }
    if (!sub) {
      console.error(
        `registerSubcommand: SUB is required and cannot be empty (received: ${String(args.SUB)})`
      );
      return;
    }
    if (!this._isValidCmdOrSubToken(cmd)) {
      console.error(`registerSubcommand: invalid or reserved CMD name '${cmd}'`);
      return;
    }
    if (!this._isValidCmdOrSubToken(sub)) {
      console.error(`registerSubcommand: invalid or reserved SUB name '${sub}'`);
      return;
    }
    if (!hasOwn(this.commands, cmd))
      this.commands[cmd] = {
        description: '',
        subcommands: Object.create(null),
        args: [],
        flags: [],
      };
    if (!hasOwn(this.commands[cmd].subcommands, sub))
      this.commands[cmd].subcommands[sub] = { description: desc, args: [], flags: [] };
    else this.commands[cmd].subcommands[sub].description = desc;
  }
  addParam(args) {
    const type = String(args.TYPE).toLowerCase();
    const name = String(args.NAME).trim();
    const cmd = String(args.CMD).trim();
    const sub = String(args.SUB).trim();
    const desc = String(args.DESC).trim();
    const req = this._toYesNoBoolean(args.REQ);
    if (!cmd) {
      console.error(
        `addParam: CMD is required and cannot be empty (received: ${String(args.CMD)})`
      );
      return;
    }
    if (!name) {
      console.error(
        `addParam: NAME is required and cannot be empty (received: ${String(args.NAME)})`
      );
      return;
    }
    // Validate command/subcommand tokens before mutating the registry to avoid leaking reserved or invalid names
    if (!this._isValidCmdOrSubToken(cmd)) {
      console.error(`addParam: invalid or reserved CMD name '${cmd}'`);
      return;
    }
    if (sub !== '' && !this._isValidCmdOrSubToken(sub)) {
      console.error(`addParam: invalid or reserved SUB name '${sub}'`);
      return;
    }
    if (type !== 'argument' && type !== 'flag') {
      console.error(`addParam: unsupported TYPE '${type}'`);
      return;
    }
    // If adding a flag, validate the flag name before mutating the registry
    if (type === 'flag' && !this._isFlagName(name)) {
      console.error(
        `addParam: invalid flag name '${name}' — flag names must be alphabetic and may include digits or hyphens`
      );
      return;
    }

    if (!hasOwn(this.commands, cmd))
      this.commands[cmd] = {
        description: '',
        subcommands: Object.create(null),
        args: [],
        flags: [],
      };
    let target = this.commands[cmd];
    if (sub !== '') {
      if (!hasOwn(target.subcommands, sub))
        target.subcommands[sub] = { description: '', args: [], flags: [] };
      target = target.subcommands[sub];
    }
    if (type === 'argument') {
      const existing = target.args.find(a => a.name === name);
      if (existing) {
        existing.desc = desc;
        existing.required = req;
      } else target.args.push({ name, required: req, desc });
    } else if (type === 'flag') {
      const existing = target.flags.find(f => f.name === name);
      if (existing) existing.desc = desc;
      else target.flags.push({ name, desc });
    }
  }
  getParam(args) {
    const type = String(args.TYPE).toLowerCase();
    const name = String(args.NAME);
    if (type === 'argument')
      return hasOwn(this.currentParsedArgs, name) ? this.currentParsedArgs[name] : '';
    if (type === 'flag')
      return hasOwn(this.currentParsedFlags, name) ? this.currentParsedFlags[name] : '';
    return '';
  }
  whenCommand(args) {
    return String(args.CMD).trim() === String(this.currentExecutingCommand);
  }
  whenSubcommand(args) {
    return (
      String(args.CMD).trim() === String(this.currentExecutingCommand) &&
      String(args.SUB).trim() === String(this.currentExecutingSubcommand)
    );
  }
}

if (!Scratch?.extensions?.unsandboxed) {
  throw new Error(
    'Slate must be run unsandboxed. Disable sandboxing for this extension.'
  );
}

// Clean up any previous instance, then create a single instance and keep a reference so frameworks can call destroy() when unloading
if (
  window.triflareSlateInstance &&
  typeof window.triflareSlateInstance.destroy === 'function'
) {
  try {
    window.triflareSlateInstance.destroy();
  } catch (_e) {
    /* ignore */
  }
}
Scratch.extensions.register(
  (instance => {
    window.triflareSlateInstance = instance;
    window.SlateConfig = SlateConfig;
    return instance;
  })(new triflareSlate())
);
