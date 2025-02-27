/* eslint-disable  @typescript-eslint/naming-convention */

import {IAuthClient} from '../../../../types';
import {Client, createClientForHandler, expect} from '@loopback/testlab';
import {RestServer} from '@loopback/rest';
import {Application, inject} from '@loopback/core';
import {post, requestBody} from '@loopback/openapi-v3';
import {authenticateClient} from '../../../../decorators';
import {STRATEGY} from '../../../../strategy-name.enum';
import {getApp} from '../helpers/helpers';
import {MyAuthenticationSequence} from '../../../fixtures/sequences/authentication.sequence';
import {Strategies} from '../../../../strategies/keys';
import {AuthenticationBindings} from '../../../../keys';
import {ClientPasswordVerifyProvider} from '../../../fixtures/providers/passport-client.provider';
import {ClientPasswordStrategyFactoryProvider} from '../../../../strategies/passport/passport-client-password';

describe('Client-password strategy', () => {
  let app: Application;
  let server: RestServer;
  beforeEach(givenAServer);
  beforeEach(givenAuthenticatedSequence);
  beforeEach(getAuthVerifier);

  it('should return status 200 when options.passRequestToCallback is set true', async () => {
    class TestController {
      constructor(
        @inject(AuthenticationBindings.CURRENT_CLIENT) // tslint:disable-next-line: no-shadowed-variable
        private readonly client: IAuthClient | undefined,
      ) {}

      @authenticateClient(STRATEGY.CLIENT_PASSWORD, {passReqToCallback: true})
      @post('/test')
      test(@requestBody() body: {client_id: string; client_secret: string}) {
        return this.client;
      }
    }

    app.controller(TestController);

    const client = await whenIMakeRequestTo(server)
      .post('/test')
      .send({client_id: 'some id', client_secret: 'some secret'})
      .expect(200);

    expect(client.body).to.have.property('clientId');
    expect(client.body).to.have.property('clientSecret');
    expect(client.body.clientId).to.equal('some id');
    expect(client.body.clientSecret).to.equal('some secret');
  });

  it('should return status 200 when options.passRequestToCallback is set false', async () => {
    class TestController {
      constructor(
        @inject(AuthenticationBindings.CURRENT_CLIENT) // tslint:disable-next-line: no-shadowed-variable
        private readonly client: IAuthClient | undefined,
      ) {}

      @post('/test')
      @authenticateClient(STRATEGY.CLIENT_PASSWORD, {passReqToCallback: false})
      test(@requestBody() body: {client_id: string; client_secret: string}) {
        return this.client;
      }
    }

    app.controller(TestController);

    const client = await whenIMakeRequestTo(server)
      .post('/test')
      .send({client_id: 'some id', client_secret: 'some secret'})
      .expect(200);

    expect(client.body).to.have.property('clientId');
    expect(client.body).to.have.property('clientSecret');
    expect(client.body.clientId).to.equal('some id');
    expect(client.body.clientSecret).to.equal('some secret');
  });

  it('should return status 401 when options.passRequestToCallback is set true', async () => {
    class TestController {
      constructor(
        @inject(AuthenticationBindings.CURRENT_CLIENT) // tslint:disable-next-line: no-shadowed-variable
        private readonly client: IAuthClient | undefined,
      ) {}

      @post('/test')
      @authenticateClient(STRATEGY.CLIENT_PASSWORD, {passReqToCallback: true})
      async test(
        @requestBody()
        body: {
          client_id: string;
          client_secret: string;
        },
      ) {
        return this.client;
      }
    }

    app.controller(TestController);

    await whenIMakeRequestTo(server)
      .post('/test')
      .send({client_id: '', client_secret: 'some secret'})
      .expect(401);
  });

  it('should return status 401 when options.passRequestToCallback is set false', async () => {
    class TestController {
      constructor(
        @inject(AuthenticationBindings.CURRENT_CLIENT) // tslint:disable-next-line: no-shadowed-variable
        private readonly client: IAuthClient | undefined,
      ) {}

      @post('/test')
      @authenticateClient(STRATEGY.CLIENT_PASSWORD, {passReqToCallback: false})
      async test(
        @requestBody()
        body: {
          client_id: string;
          client_secret: string;
        },
      ) {
        return this.client;
      }
    }

    app.controller(TestController);

    await whenIMakeRequestTo(server)
      .post('/test')
      .send({client_id: '', client_secret: 'some secret'})
      .expect(401);
  });

  function whenIMakeRequestTo(restServer: RestServer): Client {
    return createClientForHandler(restServer.requestHandler);
  }

  async function givenAServer() {
    app = getApp();
    server = await app.getServer(RestServer);
  }

  function getAuthVerifier() {
    app
      .bind(Strategies.Passport.OAUTH2_CLIENT_PASSWORD_VERIFIER)
      .toProvider(ClientPasswordVerifyProvider);
    app
      .bind(Strategies.Passport.CLIENT_PASSWORD_STRATEGY_FACTORY)
      .toProvider(ClientPasswordStrategyFactoryProvider);
  }

  function givenAuthenticatedSequence() {
    // bind user defined sequence
    server.sequence(MyAuthenticationSequence);
  }
});
