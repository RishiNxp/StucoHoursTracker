type Listener = (event: MiniEvent) => void;

export class MiniEvent {
  target: MiniNode | null = null;
  currentTarget: MiniNode | null = null;
  defaultPrevented = false;
  propagationStopped = false;
  shiftKey = false;
  constructor(public type: string, options: { key?: string; shiftKey?: boolean } = {}) {
    this.key = options.key ?? "";
    this.shiftKey = options.shiftKey ?? false;
  }
  key: string;
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
}

class MiniNode {
  parentNode: MiniNode | null = null;
  childNodes: MiniNode[] = [];
  listeners = new Map<string, Listener[]>();
  constructor(public nodeType: number, public ownerDocument: MiniDocument, public nodeName: string) {}
  appendChild(node: MiniNode) { node.parentNode = this; this.childNodes.push(node); return node; }
  insertBefore(node: MiniNode, before: MiniNode | null) { node.parentNode = this; const index = before ? this.childNodes.indexOf(before) : -1; index < 0 ? this.childNodes.push(node) : this.childNodes.splice(index, 0, node); return node; }
  removeChild(node: MiniNode) { const index = this.childNodes.indexOf(node); if (index >= 0) this.childNodes.splice(index, 1); node.parentNode = null; return node; }
  addEventListener(type: string, listener: Listener) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]); }
  removeEventListener(type: string, listener: Listener) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== listener)); }
  dispatchEvent(event: MiniEvent) { if (!event.target) event.target = this; event.currentTarget = this; for (const listener of this.listeners.get(event.type) ?? []) listener(event); if (!event.propagationStopped) this.parentNode?.dispatchEvent(event); return !event.defaultPrevented; }
  get textContent(): string { return this.childNodes.map((child) => child.textContent).join(""); }
  set textContent(value: string) { this.childNodes = value ? [new MiniText(this.ownerDocument, value)] : []; if (this.childNodes[0]) this.childNodes[0].parentNode = this; }
}

class MiniText extends MiniNode {
  constructor(document: MiniDocument, public nodeValue: string) { super(3, document, "#text"); }
  override get textContent() { return this.nodeValue; }
  override set textContent(value: string) { this.nodeValue = value; }
}

export class MiniElement extends MiniNode {
  tagName: string;
  namespaceURI = "http://www.w3.org/1999/xhtml";
  style: Record<string, string> = {};
  attributes = new Map<string, string>();
  value = "";
  checked = false;
  disabled = false;
  scrollIntoViewCalls: unknown[] = [];
  constructor(document: MiniDocument, tag: string) { super(1, document, tag.toUpperCase()); this.tagName = tag.toUpperCase(); }
  setAttribute(name: string, value: unknown) { this.attributes.set(name, String(value)); if (name === "value") this.value = String(value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }
  hasAttribute(name: string) { return this.attributes.has(name); }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView(options?: unknown) { this.scrollIntoViewCalls.push(options); }
  querySelectorAll<T extends MiniElement = MiniElement>(selector: string): T[] {
    const all = descendants(this);
    if (selector.includes("button") && selector.includes("a[href]") && selector.includes("input")) {
      return all.filter((element) => !element.disabled && (element.tagName === "BUTTON" || element.tagName === "INPUT" || (element.tagName === "A" && element.hasAttribute("href")))) as T[];
    }
    return [];
  }
}

export class MiniDocument extends MiniNode {
  documentElement: MiniElement;
  body: MiniElement;
  activeElement: MiniElement | null = null;
  defaultView: Record<string, unknown>;
  constructor() {
    super(9, null as unknown as MiniDocument, "#document");
    this.ownerDocument = this;
    this.documentElement = new MiniElement(this, "html");
    this.body = new MiniElement(this, "body");
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.defaultView = {};
  }
  createElement(tag: string) { return new MiniElement(this, tag); }
  createElementNS(_namespace: string, tag: string) { const element = new MiniElement(this, tag); element.namespaceURI = _namespace; return element; }
  createTextNode(value: string) { return new MiniText(this, value); }
  getElementById(id: string) { return descendants(this).find((element) => element.getAttribute("id") === id) ?? null; }
}

export const descendants = (node: MiniNode): MiniElement[] => node.childNodes.flatMap((child) => [
  ...(child instanceof MiniElement ? [child] : []),
  ...descendants(child),
]);

export function findByText(root: MiniNode, tag: string, text: string) {
  return descendants(root).find((element) => element.tagName === tag.toUpperCase() && element.textContent.trim() === text) ?? null;
}

export function installMiniDom(url: string) {
  const document = new MiniDocument();
  const parsed = new URL(url);
  const replaceStateCalls: unknown[][] = [];
  const window = {
    document,
    location: { href: parsed.href, protocol: parsed.protocol },
    history: { replaceState: (...args: unknown[]) => replaceStateCalls.push(args) },
    HTMLElement: MiniElement,
    HTMLIFrameElement: class {},
    Node: MiniNode,
    Event: MiniEvent,
    getSelection: () => null,
    addEventListener() {},
    removeEventListener() {},
  } as Record<string, unknown>;
  window.top = window;
  window.self = window;
  document.defaultView = window;
  for (const [name, value] of Object.entries({
    window, document, Node: MiniNode, HTMLElement: MiniElement, Event: MiniEvent,
    navigator: { userAgent: "mini-dom", clipboard: { writeText: async () => undefined } },
    requestAnimationFrame: (callback: () => void) => { callback(); return 1; },
  })) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  return { document, window, replaceStateCalls };
}
