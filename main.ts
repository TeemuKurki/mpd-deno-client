import { concat, endsWith, includesNeedle } from "@std/bytes";
import { assertExists } from "@std/assert";

/**
 * TCPClient interfate
 */
export interface TCPConnection {
  sendCommand: (command: string, immediate?: boolean) => Promise<string>;
  sendBinaryCommand: (
    command: string,
    immediate?: boolean,
  ) => Promise<Uint8Array>;
  close: () => void;
}

const MSG_END_BIN = [
  new TextEncoder().encode("OK\n"),
  new TextEncoder().encode("ACK "),
];

//If connections are not alway finishing this is probably the culprit
const getResponse = async (conn: Deno.TcpConn) => {
  let data = new Uint8Array();
  const buf = new Uint8Array(512);
  while (true) {
    const bytesRead = await conn.read(buf);
    if (bytesRead === null) {
      throw new Error("Connection closed by server");
    }
    const content = buf.subarray(0, bytesRead);
    data = concat([data, content]);
    const OK_RESPONSE = endsWith(content, MSG_END_BIN[0]);
    if (OK_RESPONSE) {
      break;
    }
    const ACK_RESPONSE = includesNeedle(content, MSG_END_BIN[1]);
    if (ACK_RESPONSE) {
      break;
    }
  }
  return data;
};

/**
 * Deno TCP Client for MPD Client
 */
export class TCPClient implements TCPConnection {
  #connection: Deno.TcpConn;
  /**
   * Creates a new instance of TCP Client
   * @param connection
   */
  constructor(connection: Deno.TcpConn) {
    this.#connection = connection;
  }

  /**
   * Create a new TCPClient instance with host and port
   * @param host MPD server host address
   * @param port MPD server port number
   * @returns
   */
  static async connect(host: string, port: number): Promise<TCPClient> {
    const connection = await Deno.connect({
      hostname: host,
      port: port,
    });
    return new TCPClient(connection);
  }

  /**
   * Close connection
   */
  close(): void {
    this.#connection.close();
  }

  /**
   * Calls MPD server and waits for response
   *
   * @param command MPD command
   * @param immediate if true, do not wait for response
   * @returns MPD server response as Uint8Array
   */
  async sendBinaryCommand(
    command: string,
    immediate?: boolean,
  ): Promise<Uint8Array> {
    assertExists(this.#connection, "No open connections");
    const buffer = new TextEncoder().encode(command);
    this.#connection.write(buffer);
    if (immediate) {
      const resultBuffer = new Uint8Array(128);
      //TODO: handle noidle return value. Could be empty
      this.#connection.read(resultBuffer);
      return resultBuffer;
    }
    return await getResponse(this.#connection);
  }

  /**
   * Calls MPD server and waits for response
   *
   * @param command MPD command
   * @param immediate if true, do not wait for response
   * @returns MPD server response as string
   */
  async sendCommand(command: string, immediate?: boolean): Promise<string> {
    const data = await this.sendBinaryCommand(command, immediate);
    return new TextDecoder().decode(data);
  }
}
