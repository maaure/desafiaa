import { io, type Socket } from "socket.io-client";

const WS_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export function createPlayerSocket(pin: string): Socket {
  return io(`${WS_URL}/play`, { query: { pin } });
}
