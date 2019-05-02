import * as keys from '@ndhoule/keys';
import * as integration from '@segment/analytics.js-integration';
import * as Queue from '@segment/localstorage-retry';
import * as utm from '@segment/utm-params';

import sendData from './helpers/sendData';
import { Callback } from './types';

// TODO: Is 32kb good for default?
const MAX_SIZE = 32000;

const Wildcard = integration('Wildcard')
  .option('name', '')
  .option('endpoint', '')
  .option('maxPayloadSize', MAX_SIZE);

const queueOptions = {
  maxRetryDelay: 360000,
  minRetryDelay: 1000,
  backoffFactor: 2,
  maxAttempts: 10,
  maxItems: 100,
};

Wildcard.global = window;

Wildcard.prototype.initialize = function() {
  const self = this;

  this.queue = new Queue(this.options.name || 'analytics', queueOptions, (item: any, done: Callback) => {
    item.msg.sentAt = new Date();

    sendData(item.url, item.msg, item.headers, 10000, (error, response) => {
      self.debug('sent %O, received %O', item.msg, [error, response]);
      if (error) { return done(error); }
      return done(null, response);
    });
  });

  this.queue.start();

  this.ready();

  this.analytics.on('invoke', (message: any) => {
    const action = message.action();
    const listener = 'on' + message.action();
    self.debug('%s %o', action, message);
    if (self[listener]) { self[listener](message); }
    self.ready();
  });
};

Wildcard.prototype.loaded = () => true;

Wildcard.prototype.normalizeData = function(message: any) {
  this.debug('normalize %o', message);

  const user = this.analytics.user();
  const query = Wildcard.global.location.search;

  const context = message.context = message.context || message.options || {};
  delete message.options;
  context.userAgent = navigator.userAgent;

  if (!context.library) {
    context.library = {
      name: `${this.options.name || 'analytics'}.js`,
      version: this.analytics.VERSION,
    };
  }

  // if user provides campaign via context, do not overwrite with UTM qs param
  if (query && !context.campaign) {
    context.campaign = utm(query);
  }

  message.userId = message.userId || user.id();
  message.anonymousId = user.anonymousId();
  message.sentAt = new Date();

  const failedInitializations = this.analytics.failedInitializations || [];

  if (failedInitializations.length > 0) {
    message._metadata = { failedInitializations };
  }

  if (this.options.addBundledMetadata) {
    const bundled = keys(this.analytics.Integrations);
    message._metadata = message._metadata || {};
    message._metadata.bundled = bundled;
    message._metadata.unbundled = this.options.unbundledIntegrations;
  }

  this.debug('normalized %o', message);

  return message;
};

Wildcard.prototype.addToQueue = function(path: string, message: any) {
  const url = `${this.options.endpoint}${path}`;
  const headers = { 'Content-Type': 'text/plain' };
  const normalizedMessage = this.normalizeData(message);

  if (JSON.stringify(normalizedMessage).length > this.options.maxPayloadSize) {
    this.debug('message too long to be sent to the endpoint %O', normalizedMessage);
    return;
  }

  this.debug('adding message to queue %O', message);

  const item = {
    url,
    headers,
    msg: normalizedMessage,
  };

  this.queue.addItem(item);
  return item;
};

Wildcard.prototype.onpage = function(page: any) {
  this.addToQueue('/page', page.json());
};

Wildcard.prototype.onidentify = function(identify: any) {
  this.addToQueue('/identify', identify.json());
};

Wildcard.prototype.ongroup = function(group: any) {
  this.addToQueue('/group', group.json());
};

Wildcard.prototype.ontrack = function(track: any) {
  this.addToQueue('/track', track.json());
};

Wildcard.prototype.onalias = function(alias: any) {
  const json = alias.json();
  const user = this.analytics.user();
  json.previousId = json.previousId || json.from || user.id() || user.anonymousId();
  json.userId = json.userId || json.to;
  delete json.from;
  delete json.to;
  this.addToQueue('/alias', json);
};

export {
  MAX_SIZE,
};

export default Wildcard;
