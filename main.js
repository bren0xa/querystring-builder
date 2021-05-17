void function() {
  class EventEmitter {
    constructor() {
      /** @type {Record<any, Set<Function>>} */
      this._listeners = {};
    }

    on(event, callback) {
      if (!(event in this._listeners))
        this._listeners[event] = new Set();
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
  /** @type {HTMLDivElement} */
  const builder = document.getElementById("builder");
  /** @type {HTMLDivElement} */
  const result = document.getElementById("result");
  /** @type {HTMLButtonElement} */
  const addButton = document.getElementById("parameter_add");

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

      this.nameInput.addEventListener("input", () => this.emit("update", this.getValue()));
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


  function updateDisplay() {
    let url = null;
    if (base.validity.valid && base.value) {
      try {
        url = new URL(base.value);
      } catch {}
    }
    const qs = url?.searchParams ?? new URLSearchParams();

    for (const segment of segments) {
      const value = segment.getValue();
      if (value)
        qs.set(value.name, value.value);
    }
    if (url) {
      url.searchParams = qs;
      result.innerText = url.toString();
    } else if (qs.toString()) {
      result.innerText = qs.toString();
    } else {
      result.innerHTML = "&nbsp;";
    }
  }

  function addSegment() {
    const segment = new Segment();
    segment.on("append", () => segments.add(segment));
    segment.on("remove", () => segments.delete(segment));
    segment.on("update", value => updateDisplay());
    segment.appendTo(builder);
  }

  base.addEventListener("input", () => updateDisplay());

  addButton.addEventListener("click", () => addSegment());

  updateDisplay();
}();
