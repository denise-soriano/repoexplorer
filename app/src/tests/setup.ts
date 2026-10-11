import '@testing-library/jest-dom';

vi.stubGlobal(
    'ResizeObserver',
    class {
        private callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
        }

        observe(target: Element) {
            this.callback(
                [
                    {
                        target,
                        contentRect: target.getBoundingClientRect(),
                    } as ResizeObserverEntry,
                ],
                this as unknown as ResizeObserver,
            );
        }

        unobserve() {}
        disconnect() {}
    },
);

Object.defineProperties(HTMLElement.prototype, {
    offsetWidth: {
        configurable: true,
        value: 500,
    },
    offsetHeight: {
        configurable: true,
        value: 500,
    },
});

Element.prototype.getBoundingClientRect = () => ({
    width: 500,
    height: 500,
    top: 0,
    left: 0,
    bottom: 500,
    right: 500,
    x: 0,
    y: 0,
    toJSON: () => {},
});
