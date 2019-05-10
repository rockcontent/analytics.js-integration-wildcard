import * as send from '@segment/send-json';

import { Callback } from '../types';

const sendData = (
  url: string,
  body: any,
  headers: any,
  timeout: number,
  withCredentials: boolean = false,
  callback: Callback,
) => {
  // If cors is disabled use @segment/send-json
  if (send.type !== 'xhr') {
    send(url, body, headers, callback);
    return;
  }

  const request = new XMLHttpRequest();
  request.withCredentials = withCredentials;
  request.onerror = callback;
  request.onreadystatechange = () => {
    if (request.readyState === 4) {
      // Fail on 429 and 5xx HTTP errors
      if (request.status === 429 || request.status >= 500 && request.status < 600) {
        callback(new Error('HTTP Error ' + request.status + ' (' + request.statusText + ')'));
      } else {
        callback(null, request);
      }
    }
  };

  request.open('POST', url, true);

  request.timeout = timeout;
  request.ontimeout = callback;

  for (const key in headers) {
    if (key && headers[key]) {
      request.setRequestHeader(key, headers[key]);
    }
  }

  request.send(JSON.stringify(body));
};

export default sendData;
