import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export function createHostSocket(token: string): Socket {
  return io(`${WS_URL}/host`, { auth: { token } });
}
