import '@testing-library/jest-dom';

// jsdom implements neither observer API; components that use them (e.g. the
// weekly grid's mobile day-column sizing/active-day tracking) need at least
// a no-op stand-in so mounting them in a test doesn't throw. Real behavior
// for these is covered by manual/Chrome verification, not unit tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
// jsdom also doesn't implement Element.scrollTo (used to bring a day column
// into view); same rationale as the observer stubs above.
if (typeof Element.prototype.scrollTo === 'undefined') {
  Element.prototype.scrollTo = () => {};
}
