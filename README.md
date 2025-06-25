# Deno TCP client for MPD

Simple Deno TCP client for [@teemukurki/mpd](https://jsr.io/@teemukurki/mpd)

## Usage

```ts
import { TCPClient } from "@teemukurki/mpd-deno-client";
import { MPDClient } from "@teemukurki/mpd";

const MPD_HOST = "localhost";
const MPD_PORT = 6600;

const client = new MPDClient(
  TCPClient,
  MPD_HOST,
  MPD_PORT,
);

const status = await client.status();
console.log(status);
```
