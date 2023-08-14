import ws from "websocket"
import { ExchangeReq } from "./cluster-rpc_pb"

const sock = new ws.client()
sock.on("connect", conn => {
    conn.on("message", data => {
        const test = ""
    })
    const req = new ExchangeReq()
    req.event = "room:join"
    req.to = "test"
    conn.sendBytes(Buffer.from(req.serializeBinary()))
})
sock.connect("ws://127.0.0.1:7000/comms")