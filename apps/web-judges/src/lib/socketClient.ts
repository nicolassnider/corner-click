import { io, Socket } from "socket.io-client";
import { API_URL } from "../utils/apiClient";
import { SocketEvent, SocketRole } from "@corner-click/types";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
};

export const connectSocket = (
  areaId: string,
  role: SocketRole,
  judgeId?: string,
  judgeName?: string,
  corner?: string,
) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }

  s.emit(SocketEvent.JOIN_AREA, {
    areaId,
    role,
    judgeId,
    judgeName,
    corner,
  });

  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
