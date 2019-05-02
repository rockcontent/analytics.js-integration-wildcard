import * as Analytics from '@segment/analytics.js-core';
import * as integration from '@segment/analytics.js-integration';
import * as tester from '@segment/analytics.js-integration-tester';
import * as clearEnv from '@segment/clear-env';
import * as sinon from 'sinon';

import Wildcard, { MAX_SIZE } from '../src/index';
import { IWildcardOptions } from '../src/types';

describe('Wildcard', () => {
  let wildcard: typeof Wildcard;
  let analytics: any;
  let options: IWildcardOptions;

  beforeEach(() => {
    options = { endpoint: 'https://wildcard.endpoint.com' };
    analytics = new Analytics.constructor();
    wildcard = new Wildcard(options);
    analytics.use(Wildcard);
    analytics.use(tester);
    analytics.add(wildcard);
  });

  afterEach(() => {
    analytics.restore();
    analytics.reset();
    wildcard.reset();
    clearEnv();
  });

  it('should have the right settings', () => {
    analytics.compare(
      Wildcard,
      integration('Wildcard')
        .option('name', '')
        .option('endpoint', '')
        .option('maxPayloadSize', MAX_SIZE),
    );
  });

  it('should always be turned on', (done) => {
    const WildcardAnalytics = analytics.constructor;
    const wildcardAnalytics = new WildcardAnalytics();
    wildcardAnalytics.use(Wildcard);
    wildcardAnalytics.initialize({ Wildcard: options });
    wildcardAnalytics.ready(() => {
      const wildCardIntegration = wildcardAnalytics._integrations.Wildcard;
      wildCardIntegration.ontrack = sinon.spy();
      wildcardAnalytics.track('event', {}, { All: false });
      expect(wildCardIntegration.ontrack.calledOnce).toBe(true);
      expect(wildCardIntegration.loaded()).toBe(true);
      done();
    });
  });

  describe('.normalizeData', () => {
    let body: any;

    beforeEach(() => {
      analytics.initialize();
      body = {};
    });

    it('should add anonymousId', () => {
      const anonymousId = 'anonymousId';
      analytics.user().anonymousId(anonymousId);
      wildcard.normalizeData(body);
      analytics.assert(body.anonymousId === anonymousId);
    });

    it('should add sentAt', () => {
      wildcard.normalizeData(body);
      analytics.assert(body.sentAt);
      analytics.assert(body.sentAt instanceof Date);
    });

    it('should add userId', () => {
      const userId = 'userId';
      analytics.user().id(userId);
      wildcard.normalizeData(body);
      analytics.assert(body.userId === userId);
    });

    it('should not replace the userId', () => {
      analytics.user().id('userId');
      body.userId = 'existingId';
      wildcard.normalizeData(body);
      analytics.assert(body.userId === 'existingId');
    });

    it('should always add anonymousId even if userId is given', () => {
      body = { userId: 'doe' };
      wildcard.normalizeData(body);
      analytics.assert(body.anonymousId.length === 36);
    });

    it('should add context', () => {
      wildcard.normalizeData(body);
      analytics.assert(body.context);
    });

    it('should not rewrite context if provided', () => {
      const context = {};
      body = { context };
      wildcard.normalizeData(body);
      analytics.assert(body.context === context);
    });

    it('should copy options to context', () => {
      const opts = {};
      body = { options: opts };
      wildcard.normalizeData(body);
      analytics.assert(body.context === opts);
      analytics.assert(!body.options);
    });

    it('should add library', () => {
      wildcard.normalizeData(body);
      analytics.assert(body.context.library);
      analytics.assert(body.context.library.name === 'analytics.js');
      analytics.assert(body.context.library.version === analytics.VERSION);
    });

    it('should allow override of library', () => {
      const context = {
        library: {
          name: 'wildcard-library.js',
          version: '1.0.9',
        },
      };
      body = { context };
      wildcard.normalizeData(body);
      analytics.assert(body.context.library);
      analytics.assert(body.context.library.name === 'wildcard-library.js');
      analytics.assert(body.context.library.version === '1.0.9');
    });

    it('should add userAgent', () => {
      wildcard.normalizeData(body);
      analytics.assert(body.context.userAgent === navigator.userAgent);
    });

    it('should add campaign', () => {
      Wildcard.global = { navigator: {}, location: {} };
      Wildcard.global.location.search =
        '?utm_source=source&utm_medium=medium&utm_term=term&utm_content=content&utm_campaign=name';
      Wildcard.global.location.hostname = 'localhost';
      wildcard.normalizeData(body);
      analytics.assert(body);
      analytics.assert(body.context);
      analytics.assert(body.context.campaign);
      analytics.assert(body.context.campaign.source === 'source');
      analytics.assert(body.context.campaign.medium === 'medium');
      analytics.assert(body.context.campaign.term === 'term');
      analytics.assert(body.context.campaign.content === 'content');
      analytics.assert(body.context.campaign.name === 'name');
      Wildcard.global = window;
    });

    it('should allow override of campaign', () => {
      Wildcard.global = { navigator: {}, location: {} };
      Wildcard.global.location.search =
        '?utm_source=source&utm_medium=medium&utm_term=term&utm_content=content&utm_campaign=name';
      Wildcard.global.location.hostname = 'localhost';
      body = {
        context: {
          campaign: {
            source: 'overrideSource',
            medium: 'overrideMedium',
            term: 'overrideTerm',
            content: 'overrideContent',
            name: 'overrideName',
          },
        },
      };
      wildcard.normalizeData(body);
      analytics.assert(body);
      analytics.assert(body.context);
      analytics.assert(body.context.campaign);
      analytics.assert(body.context.campaign.source === 'overrideSource');
      analytics.assert(body.context.campaign.medium === 'overrideMedium');
      analytics.assert(body.context.campaign.term === 'overrideTerm');
      analytics.assert(body.context.campaign.content === 'overrideContent');
      analytics.assert(body.context.campaign.name === 'overrideName');
      Wildcard.global = window;
    });

    describe('failed initializations', () => {
      it('add failedInitializations as part of _metadata object if analytics.failedInitilizations is not empty', () => {
        const spy = sinon.spy(wildcard, 'normalizeData');
        const TestIntegration = integration('TestIntegration');
        TestIntegration.prototype.initialize = () => { throw new Error('Uh oh!'); };
        TestIntegration.prototype.page = () => { return; };
        const testIntegration = new (TestIntegration as any)();
        analytics.use(TestIntegration);
        analytics.add(testIntegration);
        analytics.initialize();
        analytics.page();
        expect(spy.returnValues[0]._metadata.failedInitializations[0] === 'TestIntegration')
          .toBe(true);
      });
    });

    describe('unbundling', () => {
      let wildcardUnbundled: typeof Wildcard;

      beforeEach(() => {
        const ajs = new Analytics.constructor();
        wildcardUnbundled = new Wildcard(options);
        ajs.use(Wildcard);
        ajs.use(integration('other'));
        ajs.add(wildcardUnbundled);
        ajs.initialize({ other: {} });
      });

      it('should add a list of bundled integrations when `addBundledMetadata` is set', () => {
        wildcardUnbundled.options.addBundledMetadata = true;
        wildcardUnbundled.normalizeData(body);

        expect(body).toBeDefined();
        expect(body._metadata).toBeDefined();
        expect(body._metadata.bundled).toEqual([
          'Wildcard',
          'other',
        ]);
      });

      it(
        'should add a list of unbundled integrations when `addBundledMetadata` and `unbundledIntegrations` are set',
        () => {
          wildcardUnbundled.options.addBundledMetadata = true;
          wildcardUnbundled.options.unbundledIntegrations = ['other2'];
          wildcardUnbundled.normalizeData(body);

          expect(body).toBeDefined();
          expect(body._metadata).toBeDefined();
          expect(body._metadata.unbundled).toEqual(['other2']);
      });

      it('should not add _metadata when `addBundledMetadata` is unset', () => {
        wildcardUnbundled.normalizeData(body);

        expect(body).toBeDefined();
        expect(!body._metadata).toBeDefined();
      });
    });

    it('should pick up messageId from analytics.js', () => {
      body = analytics.normalize(body);
      const messageId = body.messageId;
      wildcard.normalizeData(body);
      expect(body.messageId).toBe(messageId);
    });
  });

  describe('after loading', () => {
    beforeEach((done) => {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    describe('page', () => {
      beforeEach(() => {
        analytics.stub(wildcard, 'addToQueue');
      });

      it('should add to queue section, name and properties', () => {
        analytics.page('section', 'name', { property: true }, { opt: true });
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/page');
        analytics.assert(args[1].name === 'name');
        analytics.assert(args[1].category === 'section');
        analytics.assert(args[1].properties.property === true);
        analytics.assert(args[1].context.opt === true);
        analytics.assert(args[1].timestamp);
      });
    });

    describe('identify', () => {
      beforeEach(() => {
        analytics.stub(wildcard, 'addToQueue');
      });

      it('should add to queue an id and traits', () => {
        analytics.identify('id', { trait: true }, { opt: true });
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/identify');
        analytics.assert(args[1].userId === 'id');
        analytics.assert(args[1].traits.trait === true);
        analytics.assert(args[1].context.opt === true);
        analytics.assert(args[1].timestamp);
      });
    });

    describe('track', () => {
      beforeEach(() => {
        analytics.stub(wildcard, 'addToQueue');
      });

      it('should add to queue an event and properties', () => {
        analytics.track('event', { prop: true }, { opt: true });
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/track');
        analytics.assert(args[1].event === 'event');
        analytics.assert(args[1].context.opt === true);
        analytics.assert(args[1].properties.prop === true);
        analytics.assert(!args[1].traits);
        analytics.assert(args[1].timestamp);
      });
    });

    describe('group', () => {
      beforeEach(() => {
        analytics.stub(wildcard, 'addToQueue');
      });

      it('should add to queue groupId and traits', () => {
        analytics.group('id', { trait: true }, { opt: true });
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/group');
        analytics.assert(args[1].groupId === 'id');
        analytics.assert(args[1].context.opt === true);
        analytics.assert(args[1].traits.trait === true);
        analytics.assert(args[1].timestamp);
      });
    });

    describe('alias', () => {
      beforeEach(() => {
        analytics.stub(wildcard, 'addToQueue');
      });

      it('should add to queue .userId and .previousId', () => {
        analytics.alias('to', 'from');
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/alias');
        analytics.assert(args[1].previousId === 'from');
        analytics.assert(args[1].userId === 'to');
        analytics.assert(args[1].timestamp);
      });

      it('should fallback to user.anonymousId if .previousId is omitted', () => {
        analytics.user().anonymousId('anon-id');
        analytics.alias('to');
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/alias');
        analytics.assert(args[1].previousId === 'anon-id');
        analytics.assert(args[1].userId === 'to');
        analytics.assert(args[1].timestamp);
      });

      it('should fallback to user.anonymousId if .previousId and user.id are falsey', () => {
        analytics.alias('to');
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/alias');
        analytics.assert(args[1].previousId);
        analytics.assert(args[1].previousId.length === 36);
        analytics.assert(args[1].userId === 'to');
      });

      it('should rename `.from` and `.to` to `.previousId` and `.userId`', () => {
        analytics.alias('user-id', 'previous-id');
        const args = wildcard.addToQueue.args[0];
        analytics.assert(args[0] === '/alias');
        analytics.assert(args[1].previousId === 'previous-id');
        analytics.assert(args[1].userId === 'user-id');
        analytics.assert(!args[1].from);
        analytics.assert(!args[1].to);
      });
    });

    describe('addToQueue', () => {
      let xhr: sinon.SinonFakeXMLHttpRequestStatic;

      beforeEach(() => {
        xhr = sinon.useFakeXMLHttpRequest();
      });

      afterEach(() => {
        if (xhr.restore) { xhr.restore(); }
      });

      it('should add to queue to `options.endpoint`', () => {
        const spy = sinon.spy();
        xhr.onCreate = spy;

        wildcard.options.endpoint = 'https://api.example.com';

        const item = wildcard.addToQueue('/i', { userId: 'id' });

        expect(item).toBeDefined();
        expect(item.url).toBe('https://api.example.com/i');
        expect(spy.calledOnce).toBe(true);
        const request = spy.getCall(0).args[0];
        expect(request.url).toBe('https://api.example.com/i');
        expect(request.requestBody).toBeDefined();
      });

      it('should add to queue a normalized payload', () => {
        const spy = sinon.spy();
        xhr.onCreate = spy;

        const payload = {
          key1: 'value1',
          key2: 'value2',
        };

        wildcard.normalizeData = (body: any) => Object.keys(body);
        const item = wildcard.addToQueue('/i', payload);

        expect(item).toBeDefined();
        expect(item.msg).toEqual(['key1', 'key2']);
        expect(spy.calledOnce).toBe(true);
        const request = spy.getCall(0).args[0];
        expect(request.url).toBe('https://wildcard.endpoint.com/i');
        expect(request.requestBody).toBeDefined();
      });

      it('should not add to queue an oversized payload', () => {
        const spy = sinon.spy();
        xhr.onCreate = spy;

        const payload: any = {};
        for (let i = 0; i < 1750; i++) {
          payload['key' + i] = 'value' + i;
        }

        wildcard.debug = sinon.spy();
        wildcard.normalizeData = (body: any) => body;
        const item = wildcard.addToQueue('/i', payload);

        expect(wildcard.debug.calledOnce).toBe(true);
        expect(item).not.toBeDefined();
        expect(spy.calledOnce).toBe(false);
      });
    });
  });
});
