import ws from "websocket"
import { ExchangeReq } from "./cluster-rpc_pb"
import { EventEmitter } from "events"

class WebSocket {
    private readonly conn: ws.connection
    private readonly emitter: EventEmitter
    constructor(conn: ws.connection, emitter: EventEmitter) {
        this.conn = conn
        this.emitter = emitter
    }
    close() {
        this.conn.close()
    }
    on(event: "message", cb: (data: string)=> void) {
        this.emitter.on(event, cb)
    }
    off(event: "message", cb: (data: string)=> void) {
        this.emitter.off(event, cb)
    }
    emit(event: "emit:room" | "emit:socket" | "room:join", id: string, data: string | null) {
        this.emitter.emit(event, id, data)
    }
}

export default function Create (host: string): Promise<WebSocket>{
    return new Promise<WebSocket>(res=> {
        const emitter = new EventEmitter()
        const sock = new ws.client()
        sock.on("connect", conn => {
            conn.on("message", data => {
                const req = ExchangeReq.deserializeBinary((data as any).binaryData)
                emitter.emit("message", Buffer.from(req.message).toString())
            })
            emitter.on("room:join", (room) => {
                const req = new ExchangeReq()
                req.event = "room:join"
                req.to = room
                conn.sendBytes(Buffer.from(req.serializeBinary()))
            })
            emitter.on("emit:room", (room, data) => {
                const req = new ExchangeReq()
                req.event = "emit:room"
                req.to = room
                req.message = Buffer.from(data)
                conn.sendBytes(Buffer.from(req.serializeBinary()))
            })
            emitter.on("emit:socket", (socket, data) => {
                const req = new ExchangeReq()
                req.event = "emit:socket"
                req.to = socket
                req.message = Buffer.from(data)
                conn.sendBytes(Buffer.from(req.serializeBinary()))
            })
            return res(new WebSocket(conn, emitter))
        })
        sock.connect(host);
    })
}


async function main() {
    const conn = await Create("ws://127.0.0.1:8000/comms")
    conn.emit("room:join", "test", null)
    setInterval(()=> {
        conn.emit("emit:room", "test", "ok")
    }, 5000)
}

main()