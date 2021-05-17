void (function () {
  class EventEmitter {
    constructor() {
      /** @type {Record<any, Set<Function>>} */
      this._listeners = {};
    }

    on(event, callback) {
      if (!(event in this._listeners)) this._listeners[event] = new Set();
      this._listeners[event].add(callback);
    }

    off(event, callback = null) {
      const listeners = this._listeners[event];
      if (listeners) {
        if (callback) listeners.delete(callback);
        else listeners.clear();
      }
    }

    emit(event, ...data) {
      const listeners = this._listeners[event];
      if (listeners) {
        for (const callback of listeners) {
          callback(...data);
        }
      }
    }
  }

  /** @type {HTMLInputElement} */
  const base = document.getElementById("base");
  /** @type {HTMLButtonElement} */
  const parseButton = document.getElementById("parse_url");
  /** @type {HTMLDivElement} */
  const builder = document.getElementById("builder");
  /** @type {HTMLDivElement} */
  const result = document.getElementById("result");
  /** @type {HTMLButtonElement} */
  const addButton = document.getElementById("parameter_add");
  /** @type {HTMLButtonElement} */
  const resetButton = document.getElementById("reset");

  /** @type {Set<Segment>} */
  const segments = new Set();

  class Segment extends EventEmitter {
    constructor() {
      super();

      this.container = document.createElement("div");
      this.container.classList.add("segment");

      this.nameInput = document.createElement("input");
      this.nameInput.classList.add("segment-name");
      this.nameInput.placeholder = "name";

      this.valueInput = document.createElement("input");
      this.valueInput.classList.add("segment-value");
      this.valueInput.placeholder = "value";

      this.deleteButton = document.createElement("button");
      this.deleteButton.classList.add("segment-delete");
      this.deleteButton.innerText = "Delete";

      this.container.appendChild(this.nameInput);
      this.container.appendChild(this.valueInput);
      this.container.appendChild(this.deleteButton);

      this.active = false;

      // Bind events

      this.nameInput.addEventListener("input", () => {
        this.emit("update", this.getValue());
        this.emit("nameFocus");
      });
      this.nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.emit("enter");
      });
      this.valueInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.emit("enter");
      });
      this.nameInput.addEventListener("focus", () => this.emit("nameFocus"));
      this.nameInput.addEventListener("blur", () => this.emit("nameBlur"));
      this.valueInput.addEventListener("input", () => this.emit("update", this.getValue()));
      this.deleteButton.addEventListener("click", () => this.remove());
    }

    getValue() {
      if (this.active && this.nameInput.value) {
        return {
          name: this.nameInput.value,
          value: this.valueInput.value,
        };
      } else {
        return null;
      }
    }

    /** @param {HTMLElement} parent */
    appendTo(parent) {
      this.container.remove();
      parent.appendChild(this.container);
      this.active = true;
      this.emit("append");
    }

    remove() {
      this.container.remove();
      this.active = false;
      this.emit("remove");
    }
  }

  function updateCurrentPageURL(calculatedURL) {
    const url = new URL(window.location);
    url.search = "";
    if (calculatedURL) url.searchParams.set("url", calculatedURL);
    window.history.replaceState(null, document.title, url.toString());
  }

  function updateDisplay() {
    let url = null;
    if (base.value) {
      try {
        url = new URL(base.value);
      } catch {}
    }
    const qs = url?.searchParams ?? new URLSearchParams(base.value || "");

    for (const segment of segments) {
      const value = segment.getValue();
      if (value) qs.set(value.name, value.value);
    }
    if (url) {
      url.searchParams = qs;
      result.innerText = url.toString();
      updateCurrentPageURL(url.toString());
    } else if (qs.toString()) {
      result.innerText = qs.toString();
      updateCurrentPageURL(qs.toString());
    } else {
      result.innerHTML = "&nbsp;";
    }
  }

  function addSegment() {
    const segment = new Segment();
    segment.on("append", () => {
      segments.add(segment);
      updateDisplay();
    });
    segment.on("remove", () => {
      segments.delete(segment);
      updateDisplay();
    });
    segment.on("update", (value) => updateDisplay());
    segment.on("nameFocus", () => {
      for (const otherSegment of segments) {
        const value = otherSegment.getValue();
        if (value && value.name === segment.getValue()?.name && otherSegment !== segment) {
          otherSegment.nameInput.classList.add("highlight");
          segment.nameInput.classList.add("highlight");
        } else if (otherSegment !== segment) {
          otherSegment.nameInput.classList.remove("highlight");
        }
      }
      updateDisplay();
    });
    segment.on("nameBlur", () => {
      for (const segment of segments) segment.nameInput.classList.remove("highlight");
      if (!segment.getValue()) segment.remove();
      updateDisplay();
    });
    segment.on("enter", () => {
      if (segment.getValue()) addSegment();
    });
    segment.appendTo(builder);
    segment.nameInput.focus();
    return segment;
  }

  base.addEventListener("input", () => updateDisplay());

  function parseBaseURL() {
    let url = null;
    if (base.validity.valid && base.value) {
      try {
        url = new URL(base.value);
      } catch {}
    }
    try {
      const qs = new URLSearchParams(url?.searchParams ?? base.value);
      if (url) {
        url.search = "";
        base.value = url;
      }

      for (const segment of segments) segment.remove();

      for (const [key, value] of qs.entries()) {
        const segment = addSegment();
        segment.nameInput.value = key;
        segment.valueInput.value = value;
      }
    } catch {}
    updateDisplay();
  }

  function resetContent() {
    base.value = "";
    for (const segment of segments) segment.remove();
    updateCurrentPageURL();
    updateDisplay();
  }

  resetButton.addEventListener("click", () => resetContent());

  parseButton.addEventListener("click", () => parseBaseURL());

  addButton.addEventListener("click", () => {
    addSegment();
    updateDisplay();
  });

  // Parse GET request
  const windowURL = new URL(window.location.toString());
  const qsUrl = windowURL.searchParams.get("url");
  if (qsUrl) base.value = qsUrl;

  parseBaseURL();
})();
