# analytics.js-integration-wildcard

This is a analytics.js-compatible integration for sending all collected data directly for a custom endpoint. It was built based on the original `analytcs.js-integration-segmentio` module from Segment, which is the one used for sending data to Segment's infrastructure.

## Options while initializing integration

```typescript
  import Wildcard from './lib';

  const options: IWildcardOptions = {
    endpoint: 'https://wildcard.endpoint.com', // The endpoint all raw data will be sent
    maxPayloadSize: 32000, // Max payload size in bytes
    name: 'myanalytics', // Your library name
  };

  const wildcardIntegration = new Wildcard(options);
```

## Endpoints paths

### Events track data

`https://YOURENDPOINT.COM/track`

### Page view data

`https://YOURENDPOINT.COM/page`

### User identify data

`https://YOURENDPOINT.COM/identify`

### User alias matching data

`https://YOURENDPOINT.COM/alias`

### User grouping data

`https://YOURENDPOINT.COM/group`

## Build

To build the bundled script:

```zsh
  $ yarn build
```

## Test

```zsh
  $ yarn test
```

Watching for changes

```zsh
  $ yarn test --watch
```
