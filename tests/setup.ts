import Debug from 'debug'
import sinon from 'sinon'

declare global {
  namespace NodeJS {
    interface Global {
      debug: any;
      sinon: any;
    }
  }
}

global.debug = Debug('test');
global.sinon = sinon;
