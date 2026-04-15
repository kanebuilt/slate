/**
 * Minimal Scratch environment mock for unit testing TurboWarp extensions.
 *
 * Install the mock as a global before importing any source module that
 * references the `Scratch` global, then call `restore()` when done.
 *
 * @example
 * import { installScratchMock } from './helpers/mock-scratch.js';
 * const { mock, restore } = installScratchMock();
 * // ... import extension modules ...
 * // ... run assertions ...
 * restore();
 */

/**
 * Create a fresh Scratch mock object.
 * @returns {object} Mock Scratch object.
 */
export function createScratchMock() {
  return {
    extensions: {
      register: () => {},
      unsandboxed: true,
    },
    translate: text => text,
    BlockType: {
      BOOLEAN: 'Boolean',
      COMMAND: 'command',
      EVENT: 'event',
      HAT: 'hat',
      LOOP: 'loop',
      REPORTER: 'reporter',
      BUTTON: 'button',
      CONDITIONAL: 'conditional',
    },
    ArgumentType: {
      ANGLE: 'angle',
      BOOLEAN: 'Boolean',
      COLOR: 'color',
      IMAGE: 'image',
      NUMBER: 'number',
      STRING: 'string',
    },
  };
}

/**
 * Install a Scratch mock as `globalThis.Scratch` and a mint mock as
 * `globalThis.mint` so that extension source modules which reference these
 * globals work in Node.js tests.
 *
 * @returns {{ mock: object, restore: () => void }}
 *   `mock`    — the installed Scratch mock (mutate to override behaviour).
 *   `restore` — call to remove or restore the original global values.
 */
function createDocumentMock() {
  const findByPredicate = (nodes, predicate) => {
    for (const node of nodes) {
      if (predicate(node)) return node;
      const found = findByPredicate(node.children || [], predicate);
      if (found) return found;
    }
    return null;
  };

  const root = {
    children: [],
    appendChild(node) {
      this.children.push(node);
      node.parentNode = this;
      return node;
    },
    removeChild(node) {
      const idx = this.children.indexOf(node);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        node.parentNode = null;
      }
      return node;
    },
    contains(target) {
      return this.children.includes(target);
    },
  };

  function createNode(tagName) {
    const style = {
      setProperty(_, value) {
        // allow CSS variable assignment
        return value;
      },
    };
    const node = {
      tagName: String(tagName).toUpperCase(),
      style,
      dataset: {},
      attributes: {},
      children: [],
      parentNode: null,
      innerHTML: '',
      innerText: '',
      textContent: '',
      offsetParent: root,
      offsetHeight: 0,
      offsetWidth: 0,
      clientHeight: 0,
      clientWidth: 0,
      focus() {},
      blur() {},
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },
      addEventListener() {},
      removeEventListener() {},
      removeAttribute(name) {
        delete this.attributes[name];
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      getAttribute(name) {
        return this.attributes[name];
      },
      querySelector(selector) {
        const loadingTaskMatch = /\[data-loading-task-id="([^"]+)"\]/.exec(selector || '');
        if (loadingTaskMatch) {
          const wanted = loadingTaskMatch[1];
          return findByPredicate(this.children, child => child?.dataset?.loadingTaskId === wanted);
        }
        return null;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: this.clientWidth || 0,
          height: this.clientHeight || 0,
        };
      },
      contains(target) {
        if (!target) return false;
        if (target === this) return true;
        return !!findByPredicate(this.children, child => child === target);
      },
      attachShadow() {
        const shadow = {
          mode: 'open',
          host: this,
          children: [],
          appendChild(child) {
            this.children.push(child);
            child.parentNode = this;
            return child;
          },
        };
        this.shadowRoot = shadow;
        return shadow;
      },
    };

    Object.defineProperty(node, 'childNodes', {
      get() {
        return this.children;
      },
    });
    Object.defineProperty(node, 'firstChild', {
      get() {
        return this.children[0] || null;
      },
    });

    return node;
  }

  return {
    body: root,
    createElement: createNode,
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

export function installScratchMock() {
  const originalScratch = globalThis.Scratch;
  const originalMint = globalThis.mint;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalGetComputedStyle = globalThis.getComputedStyle;

  if (globalThis.window === undefined) {
    globalThis.window = globalThis;
  }
  if (globalThis.window.addEventListener === undefined) {
    globalThis.window.addEventListener = () => {};
  }
  if (globalThis.window.removeEventListener === undefined) {
    globalThis.window.removeEventListener = () => {};
  }
  if (globalThis.document === undefined) {
    globalThis.document = createDocumentMock();
  }
  if (globalThis.window.getSelection === undefined) {
    globalThis.window.getSelection = () => ({ rangeCount: 0, isCollapsed: true });
  }
  if (globalThis.window.getComputedStyle === undefined) {
    globalThis.window.getComputedStyle = () => ({ color: 'rgb(0, 0, 0)', borderRadius: '0px' });
  }
  if (globalThis.getComputedStyle === undefined) {
    globalThis.getComputedStyle = globalThis.window.getComputedStyle;
  }
  if (globalThis.requestAnimationFrame === undefined) {
    globalThis.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 16);
  }
  if (globalThis.cancelAnimationFrame === undefined) {
    globalThis.cancelAnimationFrame = id => clearTimeout(id);
  }

  const mock = createScratchMock();
  globalThis.Scratch = mock;
  globalThis.mint = {
    assets: {
      get() {
        return undefined;
      },
      exists() {
        return false;
      },
    },
  };

  return {
    mock,
    restore: () => {
      if (originalScratch === undefined) {
        delete globalThis.Scratch;
      } else {
        globalThis.Scratch = originalScratch;
      }
      if (originalMint === undefined) {
        delete globalThis.mint;
      } else {
        globalThis.mint = originalMint;
      }
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
      if (originalDocument === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = originalDocument;
      }
      if (originalRequestAnimationFrame === undefined) {
        delete globalThis.requestAnimationFrame;
      } else {
        globalThis.requestAnimationFrame = originalRequestAnimationFrame;
      }
      if (originalCancelAnimationFrame === undefined) {
        delete globalThis.cancelAnimationFrame;
      } else {
        globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
      }
      if (originalGetComputedStyle === undefined) {
        delete globalThis.getComputedStyle;
      } else {
        globalThis.getComputedStyle = originalGetComputedStyle;
      }
    },
  };
}
