export class PromiseIterator<T> extends Promise<T> {
  iterator?: ProgressiveIterator<T>;
}

export type ErrorCallback = (message: string | Error) => void;

/**
 * A progressive iterator is an async iterator that can have data delivered
 * to it, with newer ones replacing older iterations which have not yet been
 * consume.  That allows iterating over sets of values and delivering updates,
 * but always getting the most recent instance.
 */
export default class ProgressiveIterator<T> {
  public done;
  public name?: string;

  private nextValue;
  private waiting;
  private rejectReason;

  constructor(name?) {
    this.name = name || 'unknown';
  }

  /** Casts a promise, progressive iterator or promise iterator to a
   * progressive iterator, creating one if needed to resolve it.
   */
  public static as(promise) {
    if (promise.iterator) {
      return promise.iterator;
    }
    const iterator = new ProgressiveIterator('as iterator');
    iterator.process((iterator) => {
      return promise.then(
        (v) => iterator.add(v, true),
        (reason) => iterator.reject(reason)
      );
    });
    return;
  }

  /** Add a most recent result, indicating if the result is the final one */
  public add(x: T, done = false) {
    this.nextValue = x;
    this.done ||= done;
    if (this.waiting) {
      this.waiting.resolve(x);
      this.waiting = undefined;
    }
  }

  /** Reject the fetch.  This will prevent further iteration. */
  public reject(reason: Error): void {
    this.rejectReason = reason;
    this.waiting?.reject(reason);
  }

  /** Gets the most recent value, without waiting */
  public getRecent(): T {
    if (this.rejectReason) {
      throw this.rejectReason;
    }
    return this.nextValue;
  }

  public async *[Symbol.asyncIterator]() {
    while (!this.done) {
      if (this.rejectReason) {
        throw this.rejectReason;
      }
      if (this.nextValue !== undefined) {
        //console.log('Yielding on', this.name, this.nextValue);
        yield this.nextValue;
        if (this.done) {
          break;
        }
      }
      if (!this.waiting) {
        this.waiting = {};
        this.waiting.promise = new Promise((resolve, reject) => {
          this.waiting.resolve = resolve;
          this.waiting.reject = reject;
        });
      }
      //console.log('Awaiting on', this.name);
      await this.waiting.promise;
    }
    console.log('Final yield on', this.name);
    yield this.nextValue;
  }

  public process(processFunction, errorCallback?: ErrorCallback): Promise<any> {
    return processFunction(this, this.reject.bind(this)).then(
      () => {
        if (!this.done) {
          // Set it to done
          this.add(this.nextValue, true);
        }
      },
      (reason) => {
        if (errorCallback) {
          errorCallback(reason);
        } else {
          console.warn("Couldn't process because", reason);
        }
      }
    );
  }

  async nextPromise(): Promise<T> {
    for await (const i of this) {
      if (i) {
        return i;
      }
    }
    throw new Error('Nothing found');
  }

  async donePromise(): Promise<T> {
    for await (const i of this) {
      if (i) {
        return i;
      }
    }
    throw new Error('Nothing found');
  }

  public getNextPromise() {
    const promise = this.nextPromise() as PromiseIterator<T>;
    promise.iterator = this;
    return promise;
  }

  public getDonePromise() {
    const promise = this.donePromise() as PromiseIterator<T>;
    promise.iterator = this;
    return promise;
  }
}
