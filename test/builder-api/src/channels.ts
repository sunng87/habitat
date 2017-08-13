import { expect } from 'chai';
import supertest = require('supertest');

const request = supertest('http://localhost:9636/v1');
const globalAny:any = global;

describe('Channel related API', function() {
  describe('Create a channel', function() {
    it('makes a new channel appear', function(done) {
      request.post('/depot/channels/core/foo')
        .set('Authorization', globalAny.bobo_bearer)
        .expect(201)
        .end(function(err, res) {
          expect(res.body.name).to.equal("foo");
          done(err);
        });
    });
  });
});
