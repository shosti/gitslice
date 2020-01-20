import Debug from 'debug'
import chai, { expect } from 'chai'
import sinon from 'sinon'

declare global {
  namespace NodeJS {
    interface Global {
      debug: any
      expect: any
      sinon: any
      chai: any
      app: any
    }
  }
}

global.debug = Debug('test')
global.expect = expect
global.chai = chai
global.sinon = sinon
